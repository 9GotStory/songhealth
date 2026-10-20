#!/usr/bin/python3
"""Narrow reviewed installer for the T021 Gate A maintenance bundle
(corrective round 1).

Resolves the installed controller's hash-bound artifact/activation bootstrap
explicitly: instead of an operator editing controller state or hashes by
hand, or copying files until guards pass, this installer

  1. verifies THIS candidate bundle against bundle-manifest.json (offline),
  2. verifies every installed artifact against the recorded capture
     preimages (read-only; refuses on any drift),
  3. validates the Gate B install record AND the installed activation
     approval BEFORE any write — a rejected installation leaves every
     preimage untouched (manifest/activation unchanged),
  4. stages the maintenance files into the installed runtime's
     maintenance/t021-gate-a/ area with reviewed modes/UID,
  5. rewrites manifest.json/activation.json through the SAME exclusive
     temporary-file/fsync discipline the installed controller uses,
     recording ONLY the staged maintenance artifacts (mutable state,
     gate-b-record and candidate binding are deliberately NOT hash-bound
     manifest entries), and adding only the two reviewed maintenance
     operations to the approved scope,
  6. writes candidate.json — the externally accepted Gate A candidate SHA +
     bundle-manifest identity that apply/rollback/deliver-capability records
     must match (no self-referential commit SHA; a wrong-but-valid 40-hex
     candidate refuses later),
  7. records the resulting manifest identity the Gate B approval must
     reference — Gate A never manufactures that approval.

No live transition is executed. With --target <dir> everything operates on a
fake filesystem (offline tests); the live path additionally requires the
Gate B record and activation approval. NOT EXECUTED / NOT AUTHORIZED YET.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys

BUNDLE = Path(__file__).resolve().parent
DEFAULT_LIVE = Path('/home/multica-agent/.local/share/dev-runtimes/songhealth')

MAINTENANCE_OPERATIONS = ['maintenance-apply', 'maintenance-rollback']

# Files staged into the installed maintenance area with reviewed modes (UID
# 1001 enforced on the live path). Mutable state (state.json), the Gate B
# record and candidate.json are deliberately NOT staged here — they are
# runtime-produced private records, not reviewed artifacts, and must never
# be hash-bound manifest entries.
STAGED = {
    'runtime.py': '0755',
    'compose.yaml': '0644',
    'config/astro.dev.config.mjs': '0644',
    'install-maintenance.py': '0755',
    'maintenance-contract.json': '0644',
    'bundle-manifest.json': '0644',
    'GATE-B-EXECUTION.md': '0644',
    'tests/test_t021_maintenance.py': '0644',
}


class Refusal(Exception):
    pass


def require(condition, field):
    if not condition:
        raise Refusal(field)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def owned(path, private=False):
    p = Path(path)
    require(p.exists() and not p.is_symlink(), 'owned regular path')
    if not getattr(owned, 'skip_uid', False):
        require(p.stat().st_uid == 1001, 'owned regular path')
    require(not (p.stat().st_mode & (0o077 if private else 0o022)), 'path permissions')
    return p


def save_json(path, value, mode=0o644):
    tmp = path.with_suffix('.tmp')
    require(not path.is_symlink() and not tmp.exists(), 'state path')
    fd = os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, mode)
    with os.fdopen(fd, 'w') as handle:
        json.dump(value, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def verify_bundle():
    manifest = json.loads((BUNDLE / 'bundle-manifest.json').read_text())
    for name, expected in manifest['files'].items():
        path = BUNDLE / name
        require(not Path(name).is_absolute() and '..' not in Path(name).parts, 'manifest path')
        require(sha(owned(path)) == expected, 'bundle artifact hash')
        require(path.stat().st_mode & 0o777 == int(manifest['modes'][name], 8), 'bundle file mode')
    return manifest


def verify_installed_preimages(live):
    capture = json.loads((BUNDLE / 'bundle-manifest.json').read_text())['preimage_capture']['files']
    for name, meta in capture.items():
        path = live / name
        require(sha(owned(path)) == meta['sha256'], 'installed preimage drift')
        require(path.stat().st_size == meta['bytes'], 'installed preimage size')
    return json.loads(owned(live / 'manifest.json').read_text())


def validate_before_write(live, offline):
    """Everything that can refuse must refuse BEFORE the first write (A1):
    Gate B install record, installed activation approval, and the candidate
    binding fields. Returns the validated record."""
    if offline:
        return {'schema': 2, 'operation': 'install', 'gate_a_candidate_sha': 'f' * 40,
                'bundle_manifest_sha256': sha(BUNDLE / 'bundle-manifest.json'),
                'gate_a_review_reference': 'offline', 'independent_review_reference': 'offline',
                'po_reference': 'offline'}
    path = live / 'maintenance/t021-gate-a/gate-b-record.json'
    record = json.loads(owned(path, private=True).read_text())
    require(record.get('schema') == 2 and record.get('operation') == 'install',
            'gate-b installation approval')
    for field in ('gate_a_candidate_sha', 'bundle_manifest_sha256', 'gate_a_review_reference',
                  'independent_review_reference', 'po_reference'):
        require(isinstance(record.get(field), str) and record[field].strip(), 'gate-b reference')
    require(len(record['gate_a_candidate_sha']) == 40
            and all(c in '0123456789abcdef' for c in record['gate_a_candidate_sha']),
            'gate-b candidate sha')
    require(sha(BUNDLE / 'bundle-manifest.json') == record['bundle_manifest_sha256'],
            'gate-b bundle identity')
    activation = json.loads(owned(live / 'activation.json', private=True).read_text())
    require(activation.get('approved') is True and activation.get('po_reference'),
            'activation approval')
    return record


def stage(live, offline):
    target = live / 'maintenance/t021-gate-a'
    target.mkdir(parents=True, exist_ok=True, mode=0o700)
    staged = {}
    for name, mode in STAGED.items():
        source = BUNDLE / name
        destination = target / name
        require(not destination.is_symlink(), 'staged path')
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        destination.write_bytes(source.read_bytes())
        os.chmod(destination, int(mode, 8))
        if not offline:
            os.chown(destination, 1001, 1001)
        staged[f'maintenance/t021-gate-a/{name}'] = sha(destination)
    return staged


def rewrite_manifest_and_activation(live, installed_manifest, staged, offline):
    files = dict(installed_manifest['files'])
    modes = dict(installed_manifest['modes'])
    for key, digest in staged.items():
        files[key] = digest
        modes[key] = STAGED[key.removeprefix('maintenance/t021-gate-a/')]
    updated = dict(installed_manifest)
    updated['files'] = files
    updated['modes'] = modes
    updated['maintenance'] = {
        'name': 't021-runtime-gate-a',
        'contract': sha(BUNDLE / 'maintenance-contract.json'),
        'operations': MAINTENANCE_OPERATIONS,
    }
    save_json(live / 'manifest.json', updated)
    activation = json.loads(owned(live / 'activation.json', private=True).read_text())
    operations = list(activation.get('operations', []))
    for operation in MAINTENANCE_OPERATIONS:
        require(operation not in operations, 'maintenance scope already installed')
        operations.append(operation)
    activation['operations'] = operations
    activation['manifest_sha256'] = sha(live / 'manifest.json')
    save_json(live / 'activation.json', activation, mode=0o600)
    return sha(live / 'manifest.json')


def write_candidate_record(live, record, offline):
    """The externally accepted candidate binding (A4): apply/rollback records
    must match this SHA + manifest identity. Produced only by the Gate-B
    install decision — never by the bundle itself."""
    path = live / 'maintenance/t021-gate-a/candidate.json'
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    save_json(path, {
        'schema': 1,
        'gate_a_candidate_sha': record['gate_a_candidate_sha'],
        'bundle_manifest_sha256': record['bundle_manifest_sha256'],
    }, mode=0o600)
    if not offline:
        os.chown(path, 1001, 1001)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', help='fake installed tree (offline tests); full semantics')
    parser.add_argument('--offline', action='store_true',
                        help='verification-only mode: no installed-state write')
    args = parser.parse_args()
    live = Path(args.target) if args.target else DEFAULT_LIVE
    offline = args.offline
    if args.target is not None:
        owned.skip_uid = True
    try:
        verify_bundle()
        installed_manifest = verify_installed_preimages(live)
        record = validate_before_write(live, offline)
        if offline:
            print('OFFLINE: bundle + preimage + authority verification only; '
                  'no installed-state write')
            return
        staged = stage(live, args.target is not None)
        manifest_identity = rewrite_manifest_and_activation(live, installed_manifest, staged, args.target is not None)
        write_candidate_record(live, record, offline)
        print('Installed reviewed maintenance area; manifest identity '
              + manifest_identity
              + '; Gate B must reference exactly this identity')
    except (Refusal, OSError, ValueError, KeyError) as error:
        print('install-maintenance: HOLD — '
              + (str(error) if isinstance(error, Refusal) else 'operation failed; details withheld'),
              file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
