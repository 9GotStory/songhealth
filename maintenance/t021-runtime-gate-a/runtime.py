#!/usr/bin/python3
"""Songhealth T021 Gate A maintenance controller — PREPARATION ONLY.

Offline-prepared, hash-bound maintenance support for exactly one forward
transition (recorded stable source 6ab72780… → accepted T021 source
e7e21d6…, paired with the exact protected-seed and dev-config hash pairs and
one new private Compose key) plus its paired rollback returning only to the
exact recorded source.

Inert by design: importing or running this module performs no live access
unless an explicitly Gate-B-approved record is presented, and even then only
the narrow operations named in maintenance-contract.json are available.
There is no generic arbitrary-SHA promotion, no exec, no reset, no
schema/seed application, no volume deletion, no legacy-recovery invocation
and no retry loop. Refusal messages are fixed field names; raw subprocess
output is never stringified into evidence; no secret value, hash or length
is ever printed.

Gate A authorization: PO Multica 01a156d7-aac7-72f6-bb2e-9a60624aba0d +
GitHub issue #26 issuecomment-6280752180. GATE_B/GATE_C NOT_APPROVED;
RUNTIME_INTEGRATION=HOLD at preparation time.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent                      # this offline bundle
LIVE = Path('/home/multica-agent/.local/share/dev-runtimes/songhealth')
SOURCE = Path('/home/multica-agent/projects/songhealth-dev')
STORE = Path('/home/multica-agent/projects/.songhealth-dev.git')
PODMAN = '/usr/sbin/podman'
PROVIDER = '/home/multica-agent/.local/bin/podman-compose'
PROJECT = 'songhealth-dev'
CONTAINERS = {'app': 'songhealth-dev-app', 'postgres': 'songhealth-dev-postgres'}
APP_ORIGIN = 'http://127.0.0.1:4322'
GATE_B_RECORD = LIVE / 'maintenance/t021-gate-a/gate-b-record.json'
MAINT_STATE = LIVE / 'maintenance/t021-gate-a/state.json'

# Keys required in runtime.env after the transition. The pre-existing set is
# unchanged and mandatory; the ONE new key contains digits in its name
# (SONGHEALTH_T021_ROUTE_TOKEN), so this maintenance's key grammar is
# [A-Z_][A-Z0-9_]* — the installed controller's [A-Z_]+ grammar does not
# accept digits and is NOT modified by this bundle; the Gate-B installer
# ships this module's env handling as the reviewed maintenance authority.
OLD_KEYS = {'SONGHEALTH_DEV_BOOTSTRAP_PASSWORD', 'PGPASSWORD', 'EMDASH_MIGRATION_DATABASE_URL',
            'EMDASH_ENCRYPTION_KEY', 'SONGHEALTH_DEV_GENERATION'}
NEW_KEY = 'SONGHEALTH_T021_ROUTE_TOKEN'
NEW_KEYS = OLD_KEYS | {NEW_KEY}

TOKEN_VALUE_GRAMMAR = re.compile(r'[A-Za-z0-9_-]{32,128}')

# Exact 285-byte rollback preimage of the external dev config (captured by
# the Lead, hash 14cafeae...): the paired rollback restores these bytes after
# verifying them against maintenance-contract.json before any mutation.
ROLLBACK_DEV_CONFIG = "// External development configuration: the reviewed application tree stays intact.\nimport foundation from '/app/astro.config.mjs';\nexport default {\n  ...foundation,\n  root: '/app',\n  vite: {\n    ...foundation.vite,\n    server: { ...foundation.vite?.server, strictPort: true },\n  },\n};\n"
SSR_MARKER = re.compile(r'<meta\s+name="songhealth-foundation"\s+content="public-runtime"\s*/?>')


class Refusal(Exception):
    """Fixed-field refusal; never carries raw subprocess/secret output."""


def require(condition, field):
    if not condition:
        raise Refusal(field)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def contract():
    return json.loads((ROOT / 'maintenance-contract.json').read_text())


def bundle_manifest():
    return json.loads((ROOT / 'bundle-manifest.json').read_text())


def owned(path, private=False):
    p = Path(path)
    require(p.exists() and not p.is_symlink() and p.stat().st_uid == 1001, 'owned regular path')
    require(not (p.stat().st_mode & (0o077 if private else 0o022)), 'path permissions')
    return p


def clean_env():
    # No inherited provider, Git, dotenv, PG service, NODE_OPTIONS, proxy or npm config.
    return {'PATH': '/usr/sbin:/usr/bin:/bin', 'HOME': '/home/multica-agent',
            'XDG_RUNTIME_DIR': '/run/user/1001', 'LANG': 'C.UTF-8',
            'GIT_OPTIONAL_LOCKS': '0', 'GIT_NO_LAZY_FETCH': '1', 'GIT_TERMINAL_PROMPT': '0',
            'NO_COLOR': '1'}


def run(args, *, data=None, timeout=120, allowed=(0,), cwd=None, exitcode=False):
    try:
        result = subprocess.run(args, input=data, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, env=clean_env(),
                                cwd=cwd, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        raise Refusal('command unavailable or timed out') from None
    require(result.returncode in allowed, 'command failed; raw diagnostics withheld')
    return result.returncode if exitcode else result.stdout


def engine(*args, **kwargs):
    return run([PODMAN, *args], **kwargs)


def git(*args, allowed=(0,)):
    return run(['/usr/bin/git', '--no-optional-locks', '-c', 'core.fsmonitor=false',
                '-c', 'core.hooksPath=/dev/null', '-C', str(SOURCE), *args],
               allowed=allowed).decode().strip()


# ---------------------------------------------------------------------------
# Offline authority + identity validation (no live access)
# ---------------------------------------------------------------------------

def verify_bundle():
    """Offline: this bundle's own files match bundle-manifest.json exactly."""
    manifest = bundle_manifest()
    for name, expected in manifest['files'].items():
        path = ROOT / name
        require(not Path(name).is_absolute() and '..' not in Path(name).parts, 'manifest path')
        require(sha(owned(path)) == expected, 'bundle artifact hash')
        require(path.stat().st_mode & 0o777 == int(manifest['modes'][name], 8), 'bundle file mode')
    payload = contract()['transition']['external_dev_config']
    config_path = ROOT / 'config/astro.dev.config.mjs'
    require(config_path.stat().st_size == payload['to_bytes'], 'config payload bytes')
    require(sha(config_path) == payload['to_sha256'], 'config payload hash')
    return manifest


def gate_b_authority(operation):
    """Validate the Gate B approval record against this exact bundle.

    Refuses BEFORE any live access when the record is absent, unreadable,
    bound to a different candidate/manifest (stale bundle), names a different
    operation, is missing references, or disagrees with the recorded capture
    preimages. A Gate A artifact can never manufacture this record.
    """
    require(ROOT != LIVE or os.environ.get('SONGHEALTH_GATE_A_OFFLINE') != '1',
            'offline mode forbids live authority resolution')
    record = json.loads(owned(GATE_B_RECORD, private=True).read_text())
    require(record.get('schema') == 2, 'gate-b record schema')
    require(record.get('operation') == operation, 'gate-b operation outside approval')
    for field in ('gate_a_candidate_sha', 'bundle_manifest_sha256', 'gate_a_review_reference',
                  'independent_review_reference', 'po_reference'):
        require(isinstance(record.get(field), str) and record[field].strip(), 'gate-b reference')
    require(re.fullmatch('[0-9a-f]{40}', record['gate_a_candidate_sha']), 'gate-b candidate sha')
    require(sha(ROOT / 'bundle-manifest.json') == record['bundle_manifest_sha256'],
            'gate-b bundle identity')
    expected_capture = contract()['preimage_capture']
    require(record.get('capture_preimages') == expected_capture['recorded_containers'],
            'gate-b preimage binding')
    if operation == 'rollback':
        for field in ('forward_record_sha256', 'rollback_authorization'):
            require(isinstance(record.get(field), str) and record[field].strip(), 'gate-b rollback binding')
    return record


def verify_installed_preimages(manifest=None):
    """Live read-only: every installed artifact still matches the captured preimage."""
    capture = (manifest or bundle_manifest())['preimage_capture']['files']
    for name, meta in capture.items():
        path = LIVE / name
        require(sha(owned(path)) == meta['sha256'], 'installed preimage drift')
        require(path.stat().st_size == meta['bytes'], 'installed preimage size')
    state = json.loads(owned(LIVE / 'state.json', private=True).read_text())
    require(state.get('complete') is True, 'installed runtime not complete')
    return state


def source_guard(expected):
    """Live read-only: clean detached exact source (installed-controller semantics)."""
    owned(SOURCE)
    owned(STORE)
    require(SOURCE.resolve() == SOURCE and STORE.resolve() == STORE, 'stable real source/store')
    require(git('rev-parse', '--git-common-dir') == str(STORE), 'durable repository identity')
    require(re.fullmatch('[0-9a-f]{40}', expected), 'full source SHA')
    require(git('rev-parse', 'HEAD') == expected, 'source HEAD')
    require(not git('symbolic-ref', '-q', 'HEAD', allowed=(0, 1)), 'detached HEAD')
    require(not git('status', '--porcelain=v1', '--untracked-files=all'), 'clean source')
    return expected


def read_private_env(require_new):
    """Live read-only: exact key set, narrow grammar, digits-in-key supported.

    The value is returned into memory only and never printed, hashed into
    evidence, or passed as an argument.
    """
    text = owned(LIVE / 'runtime.env', private=True).read_text()
    keys = NEW_KEYS if require_new else OLD_KEYS
    values = {}
    for line in text.splitlines():
        require(re.fullmatch(r'[A-Z_][A-Z0-9_]*=[A-Za-z0-9_:/@.\-]+', line), 'private env grammar')
        key, value = line.split('=', 1)
        require(key in keys and key not in values, 'private env key')
        values[key] = value
    require(set(values) == keys, 'private env completeness')
    # Pre-existing required values keep the installed controller's exact
    # formats and are preserved byte-for-byte (never rewritten here).
    require(re.fullmatch('[0-9a-f]{64}', values['PGPASSWORD']), 'Dev credential format')
    require(re.fullmatch('[0-9a-f]{64}', values['SONGHEALTH_DEV_BOOTSTRAP_PASSWORD']),
            'Dev credential format')
    require(re.fullmatch('emdash_enc_v1_[A-Za-z0-9_-]{43}', values['EMDASH_ENCRYPTION_KEY']),
            'native encryption key')
    require(re.fullmatch('[0-9a-f]{32}', values['SONGHEALTH_DEV_GENERATION']), 'generation format')
    url = urllib.parse.urlsplit(values['EMDASH_MIGRATION_DATABASE_URL'])
    require((url.scheme, url.hostname, url.port, url.path, url.username, url.query, url.fragment) ==
            ('postgresql', 'songhealth-dev-postgres', 5432, '/songhealth_dev',
             'songhealth_dev_app', '', ''), 'Dev migration target')
    require(url.password == values['PGPASSWORD'], 'Dev password agreement')
    if require_new:
        require(TOKEN_VALUE_GRAMMAR.fullmatch(values[NEW_KEY]), 'route token value grammar')
    return values


# ---------------------------------------------------------------------------
# Gate-B-gated live operations (never exercised in Gate A or its tests)
# ---------------------------------------------------------------------------

def save_state(record):
    path = MAINT_STATE
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_suffix('.tmp')
    require(not path.is_symlink() and not tmp.exists(), 'maintenance state path')
    fd = os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as handle:
        json.dump(record, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def app_container_id(state):
    obj = json.loads(engine('container', 'inspect', CONTAINERS['app']))
    require(len(obj) == 1 and obj[0]['Id'] == state['containers']['app'], 'app container identity')
    return obj[0]['Id']


def stop_app_only(state):
    """Validated app-only stop; postgres and all persistent resources untouched."""
    app_id = app_container_id(state)
    engine('stop', app_id)
    return app_id


def replace_app(state):
    """Single replacement app via the reviewed Compose file (environment change
    requires replacement, not restart). Never creates a second instance."""
    run([PROVIDER, '--podman-path', PODMAN, '-p', PROJECT, '-f', str(LIVE / 'compose.yaml'),
         '--env-file', str(LIVE / 'runtime.env'), 'up', '-d', 'app'], cwd=LIVE, timeout=300)
    obj = json.loads(engine('container', 'inspect', CONTAINERS['app']))
    require(len(obj) == 1, 'unique replacement app')
    return obj[0]


def bounded_health_checks(state, new_app_id):
    """Unauthenticated bounded checks only; any native-PAT verification is a
    separately authorized Gate B step whose bookkeeping writes are
    acknowledged, never hidden."""
    for attempt in range(30):
        try:
            with urllib.request.urlopen(APP_ORIGIN + '/', timeout=5) as response:
                body = response.read(65536).decode('utf-8', 'replace')
            require(SSR_MARKER.search(body), 'app SSR marker')
            break
        except (urllib.error.URLError, Refusal, OSError):
            if attempt == 29:
                raise Refusal('app health check failed')
    running = json.loads(engine('container', 'inspect', new_app_id))[0]['State']['Running']
    require(running is True, 'replacement app running')


def record_transition(direction, record, old_app_id, new_app_id, source_sha):
    save_state({
        'schema': 2,
        'operation': direction,
        'gate_b_po_reference': record['po_reference'],
        'gate_a_candidate_sha': record['gate_a_candidate_sha'],
        'source_sha': source_sha,
        'old_app_id': old_app_id,
        'new_app_id': new_app_id,
        'note': 'old app container ID retained as history only; never treated as restorable',
    })


def apply():
    """Gate-B forward transition. NOT EXECUTED / NOT AUTHORIZED at Gate A."""
    record = gate_b_authority('apply')
    transition = contract()['transition']
    state = verify_installed_preimages()
    source_guard(transition['source']['from_sha'])
    seed = SOURCE / 'seed/seed.json'
    require(sha(seed) == transition['protected_seed']['from_sha256'], 'protected seed preimage')
    read_private_env(require_new=False)

    old_app_id = stop_app_only(state)
    try:
        git('checkout', '--detach', '--no-overwrite-ignore', transition['source']['to_sha'])
        source_guard(transition['source']['to_sha'])
        require(sha(seed) == transition['protected_seed']['to_sha256'], 'protected seed result')
        config_target = LIVE / 'config/astro.dev.config.mjs'
        payload = ROOT / 'config/astro.dev.config.mjs'
        require(sha(payload) == transition['external_dev_config']['to_sha256'], 'config payload hash')
        config_target.write_bytes(payload.read_bytes())
        require(sha(config_target) == transition['external_dev_config']['to_sha256'],
                'installed config result')
        env = read_private_env(require_new=True)
        new_app = replace_app(state)
        new_app_id = new_app['Id']
        actual = dict(x.split('=', 1) for x in new_app['Config'].get('Env', []) if '=' in x)
        require(actual.get(NEW_KEY) == env[NEW_KEY], 'new private key delivered to app')
        bounded_health_checks(state, new_app_id)
        record_transition('apply', record, old_app_id, new_app_id, transition['source']['to_sha'])
        print('Reviewed forward transition applied; postgres/volumes/credentials untouched')
    except Exception:
        print('songhealth-dev maintenance: HOLD — partial state preserved; bounded rollback '
              'only under an explicit Gate B rollback record', file=sys.stderr)
        raise


def rollback():
    """Gate-B paired rollback to the exact recorded source. NOT EXECUTED /
    NOT AUTHORIZED at Gate A. Validates all rollback material BEFORE the
    first mutation; a failed or unknown rollback stops for PO (no retry)."""
    record = gate_b_authority('rollback')
    transition = contract()['transition']
    state = verify_installed_preimages()
    source_guard(transition['source']['to_sha'])
    seed = SOURCE / 'seed/seed.json'
    require(sha(seed) == transition['protected_seed']['to_sha256'], 'protected seed preimage')
    rollback_bytes = ROLLBACK_DEV_CONFIG.encode()
    require(len(rollback_bytes) == transition['external_dev_config']['from_bytes'] and
            hashlib.sha256(rollback_bytes).hexdigest() == transition['external_dev_config']['from_sha256'],
            'rollback config preimage verified')
    read_private_env(require_new=True)
    maint = json.loads(owned(MAINT_STATE, private=True).read_text())
    require(maint.get('operation') == 'apply' and maint.get('source_sha') == transition['source']['to_sha'],
            'paired forward record')

    old_app_id = stop_app_only(state)
    try:
        git('checkout', '--detach', '--no-overwrite-ignore', transition['source']['from_sha'])
        source_guard(transition['source']['from_sha'])
        require(sha(seed) == transition['protected_seed']['from_sha256'], 'protected seed rollback result')
        config_target = LIVE / 'config/astro.dev.config.mjs'
        config_target.write_bytes(rollback_bytes)
        require(sha(config_target) == transition['external_dev_config']['from_sha256'],
                'rolled-back config preimage')
        # Rollback notes: the removed old app container ID is history, never
        # restorable; a replacement app is created and its new ID recorded.
        # DB/volumes/networks/secrets are untouched; the new private key is
        # removed only through the reviewed installer's paired env restore.
        new_app = replace_app(state)
        bounded_health_checks(state, new_app['Id'])
        record_transition('rollback', record, old_app_id, new_app['Id'],
                         transition['source']['from_sha'])
        print('Reviewed paired rollback applied to the exact recorded source; '
              'postgres/volumes/credentials untouched')
    except Refusal:
        raise
    except Exception:
        print('songhealth-dev maintenance: HOLD — rollback failed; state preserved; '
              'STOP for Product Owner', file=sys.stderr)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation',
                        choices=['verify-bundle', 'plan', 'gate-b-check',
                                 'apply', 'rollback', 'deliver-capability'])
    args = parser.parse_args()
    try:
        if args.operation == 'verify-bundle':
            verify_bundle()
            print('PASS: offline bundle hashes/modes verified against bundle-manifest.json')
            return
        if args.operation == 'plan':
            print(json.dumps(contract(), indent=2, sort_keys=True))
            return
        if args.operation == 'gate-b-check':
            gate_b_authority(os.environ.get('SONGHEALTH_GATE_B_RECORD', 'check'))
            print('PASS: gate-b record binds this exact bundle')
            return
        # apply / rollback / deliver-capability are Gate-B-only live verbs.
        activation = gate_b_authority(args.operation)
        if args.operation == 'apply':
            apply()
        elif args.operation == 'rollback':
            rollback()
        else:
            deliver_capability(activation)
    except (Refusal, OSError, ValueError, KeyError, TypeError, urllib.error.URLError) as error:
        print('songhealth-dev maintenance: HOLD — '
              + (str(error) if isinstance(error, Refusal) else 'operation failed; details withheld'),
              file=sys.stderr)
        sys.exit(1)


def deliver_capability(record):
    """Gate-B-only: write the mode-0600 client copy from the private env value.

    The token moves from runtime.env (via read_private_env, in memory only)
    to the SONGHEALTH_T021_ROUTE_ACCESS path. No value, hash or length is
    printed or recorded.
    """
    env = read_private_env(require_new=True)
    target = Path(os.environ['SONGHEALTH_T021_ROUTE_ACCESS'])
    require(target.parent.stat().st_uid == 1001, 'capability path owner')
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    require(not target.is_symlink(), 'capability path')
    fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as handle:
        json.dump({'token': env[NEW_KEY]}, handle)
        handle.write('\n')
    print('capability client copy written (mode 0600, UID1001); no secret material echoed')


if __name__ == '__main__':
    main()
