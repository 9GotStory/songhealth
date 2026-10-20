#!/usr/bin/python3
"""Narrow reviewed installer for the T021 Gate A maintenance bundle.

Resolves the installed controller's hash-bound artifact/activation bootstrap
explicitly: instead of an operator editing controller state or hashes by
hand, or copying files until guards pass, this installer

  1. verifies THIS candidate bundle against bundle-manifest.json (offline),
  2. verifies every installed artifact against the recorded capture
     preimages (read-only; refuses on any drift),
  3. stages the maintenance files, the proposed compose payload, the
     474-byte dev config payload and the maintenance-contract into the
     installed runtime's maintenance/t021-gate-a/ area,
  4. rewrites manifest.json/activation.json through the SAME exclusive
     temporary-file discipline the installed controller uses, adding only
     the maintenance area and the two reviewed maintenance operations
     ('maintenance-apply', 'maintenance-rollback') to the approved scope,
  5. records the resulting manifest identity the Gate B approval must
     reference — Gate A never manufactures that approval.

No live transition is executed: staging and manifest/activation rewrite are
the ONLY installed-state writes, and they require the same Gate B record
the runtime.py live verbs require. With --target <dir> everything operates
on a fake filesystem (offline tests); the live path is never touched.
NOT EXECUTED / NOT AUTHORIZED YET at Gate A.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

BUNDLE = Path(__file__).resolve().parent
DEFAULT_LIVE = Path('/home/multica-agent/.local/share/dev-runtimes/songhealth')

INSTALLED_FILES = ['runtime.py', 'runtime.sh', 'compose.yaml',
                   'config/astro.dev.config.mjs', 'manifest.json',
                   'tests/test_runtime.py']

# Files this installer stages into the installed maintenance area and the
# modes/ownership they must carry there (UID 1001 enforced at run time).
STAGED = {
    'runtime.py': '0755',
    'compose.yaml': '0644',
    'config/astro.dev.config.mjs': '0644',
    'maintenance-contract.json': '0644',
    'bundle-manifest.json': '0644',
    'GATE-B-EXECUTION.md': '0644',
    'install-maintenance.py': '0755',
    'tests/test_t021_maintenance.py': '0644',
}

MAINTENANCE_OPERATIONS = ['maintenance-apply', 'maintenance-rollback']


class Refusal(Exception):
    pass


def require(condition, field):
    if not condition:
        raise Refusal(field)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def owned(path, private=False):
    p = Path(path)
    require(p.exists() and not p.is_symlink() and p.stat().st_uid == 1001, 'owned regular path')
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
        require(sha(path) == expected, 'bundle artifact hash')
        require(path.stat().st_mode & 0o777 == int(manifest['modes'][name], 8), 'bundle file mode')
    return manifest


def verify_installed_preimages(live):
    capture = json.loads((BUNDLE / 'bundle-manifest.json').read_text())['preimage_capture']['files']
    for name, meta in capture.items():
        path = live / name
        require(sha(owned(path)) == meta['sha256'], 'installed preimage drift')
        require(path.stat().st_size == meta['bytes'], 'installed preimage size')
    return json.loads(owned(live / 'manifest.json').read_text())


def gate_b_record(live):
    path = live / 'maintenance/t021-gate-a/gate-b-record.json'
    record = json.loads(owned(path, private=True).read_text())
    require(record.get('schema') == 2 and record.get('operation') == 'install',
            'gate-b installation approval')
    for field in ('gate_a_candidate_sha', 'bundle_manifest_sha256', 'gate_a_review_reference',
                  'independent_review_reference', 'po_reference'):
        require(isinstance(record.get(field), str) and record[field].strip(), 'gate-b reference')
    require(sha(BUNDLE / 'bundle-manifest.json') == record['bundle_manifest_sha256'],
            'gate-b bundle identity')
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
        if not offline:
            os.chmod(destination, int(mode, 8))
            os.chown(destination, 1001, 1001)
        staged[name] = sha(destination)
    return target, staged


def rewrite_manifest_and_activation(live, installed_manifest, staged, offline):
    files = dict(installed_manifest['files'])
    modes = dict(installed_manifest['modes'])
    for name, digest in staged.items():
        key = f'maintenance/t021-gate-a/{name}'
        files[key] = digest
        modes[key] = STAGED[name]
    files['maintenance/t021-gate-a/state.json'] = staged.get('maintenance-contract.json')
    modes['maintenance/t021-gate-a/state.json'] = '0600'
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
    require(activation.get('approved') is True and activation.get('po_reference'),
            'activation approval')
    operations = list(activation.get('operations', []))
    for operation in MAINTENANCE_OPERATIONS:
        require(operation not in operations, 'maintenance scope already installed')
        operations.append(operation)
    activation['operations'] = operations
    activation['manifest_sha256'] = sha(live / 'manifest.json')
    save_json(live / 'activation.json', activation, mode=0o600)
    return sha(live / 'manifest.json')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', help='offline fake installed tree (tests only)')
    parser.add_argument('--offline', action='store_true',
                        help='skip UID/chmod/chown enforcement (fake filesystem)')
    args = parser.parse_args()
    live = Path(args.target) if args.target else DEFAULT_LIVE
    offline = args.offline or args.target is not None
    try:
        verify_bundle()
        installed_manifest = verify_installed_preimages(live)
        if not offline:
            gate_b_record(live)
        else:
            # Offline mode performs no installed-state write at all.
            print('OFFLINE: bundle + preimage verification only; no installed-state write')
            return
        _, staged = stage(live, offline)
        manifest_identity = rewrite_manifest_and_activation(live, installed_manifest, staged, offline)
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
