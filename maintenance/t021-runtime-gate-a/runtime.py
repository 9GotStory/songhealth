#!/usr/bin/python3
"""Songhealth T021 Gate A maintenance controller — PREPARATION ONLY (corrective round 1).

Offline-prepared, hash-bound maintenance support for exactly one forward
transition (recorded stable source 6ab72780… → accepted T021 source e7e21d6…,
paired with the exact protected-seed and dev-config hash pairs and one new
server-only token delivered through a PRIVATE Compose env_file) plus its
paired rollback returning only to the exact recorded source.

Inert by design: importing or running this module performs no live access
unless an explicitly Gate-B-approved record is presented, and even then only
the narrow operations named in maintenance-contract.json are available.
There is no generic arbitrary-SHA promotion, no exec, no reset, no
schema/seed application, no volume deletion, no legacy-recovery invocation
and no retry loop. Refusal messages are fixed field names; raw subprocess
output is never stringified into evidence; no secret value, hash or length
is ever printed.

Corrective round (PO 01a1579a-9ff8-7b94-b366-6fed7070b38e) closes the four
reviewed blockers: stage-aware controller admission; the real token/env/
Compose execution path; durable per-stage progress with paired rollback
from interrupted states; exact candidate/forward-record binding plus the
original controller's locking and resource admission discipline.

Gate A authorization: PO Multica 01a156d7-aac7-72f6-bb2e-9a60624aba0d +
GitHub issue #26 issuecomment-6280752180. GATE_B/GATE_C NOT_APPROVED;
RUNTIME_INTEGRATION=HOLD at preparation time.
"""
import argparse
import contextlib
import fcntl
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
VOLUMES = ('songhealth-dev-postgres-data-v1', 'songhealth-dev-media-v1')
NETWORKS = ('songhealth-dev-app-net', 'songhealth-dev-db-net')
APP_ORIGIN = 'http://127.0.0.1:4322'
MAINT_AREA = LIVE / 'maintenance/t021-gate-a'
GATE_B_RECORD = MAINT_AREA / 'gate-b-record.json'
MAINT_STATE = MAINT_AREA / 'state.json'
CANDIDATE_RECORD = MAINT_AREA / 'candidate.json'
ROUTE_TOKEN_ENV = MAINT_AREA / 'route-token.env'
RUNTIME_LOCK = LIVE / 'runtime.lock'

# runtime.env keeps exactly the installed controller's reviewed five keys:
# its [A-Z_]+ grammar cannot read a digits key, so the ONE new server-only
# key is delivered through a PRIVATE Compose service env_file instead
# (route-token.env, mode 0600, UID 1001) — original routines stay
# compatible, runtime.env bytes never change, and no token value ever
# enters a public/hashed artifact, log, argv or evidence.
OLD_KEYS = {'SONGHEALTH_DEV_BOOTSTRAP_PASSWORD', 'PGPASSWORD', 'EMDASH_MIGRATION_DATABASE_URL',
            'EMDASH_ENCRYPTION_KEY', 'SONGHEALTH_DEV_GENERATION'}
NEW_KEY = 'SONGHEALTH_T021_ROUTE_TOKEN'

TOKEN_VALUE_GRAMMAR = re.compile(r'[A-Za-z0-9_-]{32,128}')

# Exact rollback preimages (captured by the Lead; re-verified against
# maintenance-contract.json / bundle-manifest.json before any mutation):
# the 285-byte external dev config and the 2704-byte installed Compose file.
ROLLBACK_DEV_CONFIG = "// External development configuration: the reviewed application tree stays intact.\nimport foundation from '/app/astro.config.mjs';\nexport default {\n  ...foundation,\n  root: '/app',\n  vite: {\n    ...foundation.vite,\n    server: { ...foundation.vite?.server, strictPort: true },\n  },\n};\n"
# Exact 2704-byte rollback preimage of the installed compose.yaml (hash
# 1646eec5…), embedded so the bundle stays within the eight-file allowlist;
# re-verified against bundle-manifest.json's capture before any mutation.
ROLLBACK_COMPOSE = 'name: songhealth-dev\nx-podman:\n  in_pod: false\nservices:\n  postgres:\n    image: docker.io/library/postgres:18.6@sha256:fc973eb97c9fd04bfa1840e0f510719a584ccb3be8debfe6a4144637a9dfe8cf\n    pull_policy: never\n    container_name: songhealth-dev-postgres\n    restart: unless-stopped\n    environment:\n      POSTGRES_DB: songhealth_dev\n      POSTGRES_USER: songhealth_dev_bootstrap\n      POSTGRES_PASSWORD: ${SONGHEALTH_DEV_BOOTSTRAP_PASSWORD:?required}\n      SONGHEALTH_DEV_APP_PASSWORD: ${PGPASSWORD:?required}\n      PGDATA: /var/lib/postgresql/18/docker\n    volumes:\n      - songhealth-dev-postgres-data-v1:/var/lib/postgresql\n      - /home/multica-agent/.local/share/dev-runtimes/songhealth/config/initdb/10-songhealth-dev-role.sh:/docker-entrypoint-initdb.d/10-songhealth-dev-role.sh:ro,z\n    networks:\n      - database\n    labels:\n      io.9gotstory.dev-runtime.application: songhealth\n      io.9gotstory.dev-runtime.owner-uid: "1001"\n      io.9gotstory.dev-runtime.generation: ${SONGHEALTH_DEV_GENERATION:?required}\n  app:\n    image: localhost/songhealth-dev-tooling:node24.21.0-npm12.2.0-r1\n    pull_policy: never\n    container_name: songhealth-dev-app\n    restart: unless-stopped\n    userns_mode: keep-id\n    user: "1001:1001"\n    working_dir: /app\n    entrypoint: ["/bin/sh", "/runtime/config/app-entry.sh"]\n    command: ["dev"]\n    environment:\n      NODE_ENV: development\n      HOME: /app/.cache/home\n      npm_config_cache: /app/.cache/npm\n      HOST: 0.0.0.0\n      PORT: "4321"\n      EMDASH_SITE_URL: http://localhost:4322\n      EMDASH_MIGRATIONS_MODE: check\n      PGHOST: songhealth-dev-postgres\n      PGPORT: "5432"\n      PGDATABASE: songhealth_dev\n      PGUSER: songhealth_dev_app\n      PGPASSWORD: ${PGPASSWORD:?required}\n      EMDASH_MIGRATION_DATABASE_URL: ${EMDASH_MIGRATION_DATABASE_URL:?required}\n      EMDASH_ENCRYPTION_KEY: ${EMDASH_ENCRYPTION_KEY:?required}\n    ports:\n      - "127.0.0.1:4322:4321"\n    volumes:\n      - /home/multica-agent/projects/songhealth-dev:/app:rw,z\n      - songhealth-dev-media-v1:/app/media\n      - /home/multica-agent/.local/share/dev-runtimes/songhealth/config:/runtime/config:ro,z\n    networks:\n      - application\n      - database\n    labels:\n      io.9gotstory.dev-runtime.application: songhealth\n      io.9gotstory.dev-runtime.owner-uid: "1001"\n      io.9gotstory.dev-runtime.generation: ${SONGHEALTH_DEV_GENERATION:?required}\nnetworks:\n  application:\n    name: songhealth-dev-app-net\n    external: true\n  database:\n    name: songhealth-dev-db-net\n    external: true\nvolumes:\n  songhealth-dev-postgres-data-v1:\n    name: songhealth-dev-postgres-data-v1\n    external: true\n  songhealth-dev-media-v1:\n    name: songhealth-dev-media-v1\n    external: true\n'
SSR_MARKER = re.compile(r'<meta\s+name="songhealth-foundation"\s+content="public-runtime"\s*/?>')

# Forward stages, in execution order; each consequential stage appends to the
# durable progress record before the next one starts.
STAGES = ('authority', 'preimages', 'app-stopped', 'source', 'config', 'compose', 'token-file', 'replacement', 'health', 'complete')


class Refusal(Exception):
    """Fixed-field refusal; never carries raw subprocess/secret output."""


def require(condition, field):
    if not condition:
        raise Refusal(field)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


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


@contextlib.contextmanager
def lock():
    """The installed controller's exact lock discipline (A4): exclusive
    non-blocking flock on the private UID1001 runtime.lock. A second
    concurrent Songhealth operation refuses; the lock is never bypassed by
    direct provider calls (all engine/provider traffic flows through the
    guarded helpers inside this lock during live verbs)."""
    p = RUNTIME_LOCK
    if p.exists():
        owned(p, private=True)
    fd = os.open(p, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise Refusal('another Songhealth operation is active') from None
        yield
    finally:
        os.close(fd)


# ---------------------------------------------------------------------------
# Offline authority + identity validation (no live access)
# ---------------------------------------------------------------------------

def verify_bundle():
    """Offline: this bundle's own files match bundle-manifest.json exactly.
    Live verbs call this too (A4): executable-payload admission is enforced
    in apply/rollback, not only via the separately invocable CLI verb."""
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


def maintenance_installed():
    """Is the reviewed maintenance area installed (stage-aware admission)?
    Derived from LIVE so redirected offline tests never probe the real host."""
    try:
        area = LIVE / 'maintenance/t021-gate-a/maintenance-contract.json'
        return area.exists() and not area.is_symlink()
    except OSError:
        return False


def verify_installed_preimages(manifest=None):
    """Stage-aware installed-artifact admission (A1).

    Pre-install: every captured file must match its preimage. After the
    reviewed installation: manifest.json/activation.json legitimately
    changed (installation is the reviewed mechanism that rewrote them), so
    admission instead requires the INSTALLED manifest to be internally
    truthful — every file it names exists with the recorded hash/mode, the
    original-controller artifact_guard contract — plus the unchanged
    originals (runtime.py, runtime.sh, compose.yaml pre-apply, dev config
    pre-apply, tests) still match their capture preimages. Post-apply
    changed files (compose/config) are admitted against the maintenance
    contract's result hashes via the progress record instead.
    """
    capture = (manifest or bundle_manifest())['preimage_capture']['files']
    installed = maintenance_installed()
    progress = read_progress(optional=True)
    stages = progress.get('stages', []) if progress else []
    applied = progress is not None and progress.get('status') == 'complete'
    changed_by_install = {'manifest.json', 'activation.json'} if installed else set()
    # An interrupted forward at/after the config/compose stages legitimately
    # changed those live files; admission then relies on the recorded stage
    # plus (when reached) the contract's result-hash checks below.
    changed_by_apply = set()
    if 'config' in stages:
        changed_by_apply.add('config/astro.dev.config.mjs')
    if 'compose' in stages:
        changed_by_apply.add('compose.yaml')
    for name, meta in capture.items():
        if name in changed_by_install or name in changed_by_apply:
            continue
        path = LIVE / name
        require(sha(owned(path)) == meta['sha256'], 'installed preimage drift')
        require(path.stat().st_size == meta['bytes'], 'installed preimage size')
    if installed:
        installed_manifest = json.loads(owned(LIVE / 'manifest.json').read_text())
        for name, expected in installed_manifest.get('files', {}).items():
            if name in changed_by_apply:
                # The applied live compose/config are admitted against the
                # maintenance contract's result hashes below, not against
                # their pre-apply manifest entries.
                continue
            path = LIVE / name
            require(not Path(name).is_absolute() and '..' not in Path(name).parts, 'manifest path')
            require(sha(owned(path)) == expected, 'reviewed artifact hash')
            require(path.stat().st_mode & 0o777 == int(installed_manifest['modes'][name], 8),
                    'reviewed file mode')
    if applied:
        transition = contract()['transition']
        require(sha(owned(LIVE / 'compose.yaml')) == compose_result_hash(),
                'applied compose identity')
        require(sha(owned(LIVE / 'config/astro.dev.config.mjs')) ==
                transition['external_dev_config']['to_sha256'], 'applied config identity')
    state = json.loads(owned(LIVE / 'state.json', private=True).read_text())
    require(state.get('complete') is True, 'installed runtime not complete')
    return state


def compose_result_hash():
    """Hash of this bundle's reviewed proposed Compose payload (the file the
    forward transition installs as the live compose.yaml)."""
    return sha(ROOT / 'compose.yaml')


def read_progress(optional=False):
    try:
        return json.loads(owned(MAINT_STATE, private=True).read_text())
    except (OSError, ValueError, Refusal):
        if optional:
            return None
        raise Refusal('maintenance progress record') from None


def record_stage(stage, record, extra=None):
    """Durable, truthful progress after each consequential stage (A3). The
    record carries only non-secret identities (stage names, SHAs, container
    IDs, references) — never token values or hashes."""
    progress = read_progress(optional=True) or {
        'schema': 3, 'operation': record['operation'], 'gate_b_po_reference': record['po_reference'],
        'gate_a_candidate_sha': record['gate_a_candidate_sha'], 'stages': [], 'status': 'in-progress',
        'old_app_id': None, 'new_app_id': None, 'source_sha': None,
    }
    progress['operation'] = record['operation']
    if stage not in progress['stages']:
        progress['stages'].append(stage)
    if stage == 'complete':
        progress['status'] = 'complete'
    if extra:
        progress.update(extra)
    path = MAINT_STATE
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    require(not path.is_symlink(), 'maintenance state path')
    tmp = path.with_suffix('.tmp')
    if tmp.exists():
        tmp.unlink()
    fd = os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as handle:
        json.dump(progress, handle, indent=2)
        handle.write('\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def record_path():
    """The Gate B record path; an explicit environment override exists so
    isolated tests/CLI negatives never touch the real private default."""
    override = os.environ.get('SONGHEALTH_GATE_B_RECORD')
    return Path(override) if override else GATE_B_RECORD


def gate_b_authority(operation):
    """Validate the Gate B approval record against this exact bundle (A4).

    Refuses BEFORE any live access when the record is absent, unreadable,
    bound to a different operation, missing references, or disagrees with
    the recorded capture preimages. The candidate SHA and bundle identity
    are additionally bound to the EXTERNALLY recorded accepted candidate
    written by the Gate-B installer (candidate.json) — a syntactically valid
    but wrong 40-hex SHA refuses. A Gate A artifact can never manufacture
    any of this.
    """
    record = json.loads(owned(record_path(), private=True).read_text())
    require(record.get('schema') == 2, 'gate-b record schema')
    require(record.get('operation') == operation, 'gate-b operation outside approval')
    for field in ('gate_a_candidate_sha', 'bundle_manifest_sha256', 'gate_a_review_reference',
                  'independent_review_reference', 'po_reference'):
        require(isinstance(record.get(field), str) and record[field].strip(), 'gate-b reference')
    require(re.fullmatch('[0-9a-f]{40}', record['gate_a_candidate_sha']), 'gate-b candidate sha')
    require(sha(ROOT / 'bundle-manifest.json') == record['bundle_manifest_sha256'],
            'gate-b bundle identity')
    accepted = json.loads(owned(CANDIDATE_RECORD, private=True).read_text())
    require(accepted.get('gate_a_candidate_sha') == record['gate_a_candidate_sha'],
            'gate-b candidate binding')
    require(accepted.get('bundle_manifest_sha256') == record['bundle_manifest_sha256'],
            'gate-b manifest binding')
    expected_capture = contract()['preimage_capture']
    require(record.get('capture_preimages') == expected_capture['recorded_containers'],
            'gate-b preimage binding')
    if operation == 'rollback':
        forward = record.get('forward_record_sha256')
        require(isinstance(forward, str) and re.fullmatch('[0-9a-f]{64}', forward or ''),
                'gate-b forward record hash')
        progress = read_progress()
        require(progress.get('operation') == 'apply', 'gate-b forward record pairing')
        require(sha_bytes(json.dumps(progress, indent=2).encode() + b'\n') == forward or
                sha(MAINT_STATE) == forward, 'gate-b forward record pairing')
    return record


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


def read_private_env():
    """Live read-only: the reviewed five-key runtime.env, exactly as the
    installed controller reads it (formats preserved). The digits-bearing
    new key NEVER lives here (A2)."""
    text = owned(LIVE / 'runtime.env', private=True).read_text()
    values = {}
    for line in text.splitlines():
        require(re.fullmatch(r'[A-Z_]+=[A-Za-z0-9_:/@.\-]+', line), 'private env grammar')
        key, value = line.split('=', 1)
        require(key in OLD_KEYS and key not in values, 'private env key')
        values[key] = value
    require(set(values) == OLD_KEYS, 'private env completeness')
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
    return values


def read_token_input(record):
    """Private Gate-B token input (A2): a mode-0600 UID1001 file holding the
    raw server-only token, named by the record's `token_input` path. Read
    once into memory; never printed, hashed into evidence, or passed as an
    argument. Validated BEFORE the app is stopped so malformed/missing/
    foreign input blocks before unsafe mutation."""
    path = record.get('token_input')
    require(isinstance(path, str) and path.strip(), 'gate-b token input path')
    target = owned(path.strip(), private=True)
    value = target.read_text().strip()
    require(TOKEN_VALUE_GRAMMAR.fullmatch(value), 'route token value grammar')
    return value


# ---------------------------------------------------------------------------
# Resource admission + app-only lifecycle (all engine traffic guarded)
# ---------------------------------------------------------------------------

def one(kind, name):
    result = json.loads(engine(kind, 'inspect', name))
    require(len(result) == 1, 'unique resource')
    return result[0]


def resource_guard(state):
    """Live-resource admission (A4): the approval JSON's recorded IDs are
    NOT proof — the actual postgres container, both volumes and both
    networks must exist under their recorded identities right now, and the
    postgres service must be running. Refusal here blocks any mutation."""
    postgres = one('container', CONTAINERS['postgres'])
    require(postgres['Id'] == state['containers']['postgres'], 'postgres resource identity')
    require(postgres['State']['Running'] is True, 'postgres resource running')
    for name in VOLUMES:
        obj = one('volume', name)
        require(obj.get('Name') == name, 'volume resource identity')
    for name in NETWORKS:
        obj = one('network', name)
        require(obj.get('name', obj.get('Name')) == name, 'network resource identity')


def current_app_id(expected):
    obj = one('container', CONTAINERS['app'])
    require(obj['Id'] == expected, 'app container identity')
    return obj


def stop_app(app_id):
    """Validated app-only stop; postgres and all persistent resources untouched."""
    engine('stop', app_id)


def replace_app(expected_old_id):
    """Single replacement app through the REVIEWED live Compose file (A2):
    the provider argv uses <live>/compose.yaml, which the forward
    transition has already replaced with this bundle's hash-verified
    proposed payload (the private route-token env_file resolves relative to
    that file). Never creates a second instance; the removed old container
    ID is history only."""
    run([PROVIDER, '--podman-path', PODMAN, '-p', PROJECT, '-f', str(LIVE / 'compose.yaml'),
         '--env-file', str(LIVE / 'runtime.env'), 'up', '-d', 'app'], cwd=LIVE, timeout=300)
    obj = one('container', CONTAINERS['app'])
    require(obj['Id'] != expected_old_id, 'replacement app identity')
    return obj


def write_token_file(value):
    """Deliver the server-only key to the single replacement app (A2): the
    private Compose env_file at maintenance/t021-gate-a/route-token.env,
    mode 0600, UID 1001, one line, never echoed. Removed by the paired
    rollback."""
    path = ROUTE_TOKEN_ENV
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    require(not path.is_symlink(), 'token env file path')
    tmp = path.with_suffix('.tmp')
    if tmp.exists():
        tmp.unlink()
    fd = os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(f'{NEW_KEY}={value}\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp, path)


def bounded_health_checks():
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
                raise Refusal('app health check failed') from None


def install_live_config():
    """Install the reviewed 474-byte dev config + proposed Compose as the
    LIVE files (A2): hash-verified copies from this bundle; the staged
    payload is no longer unrelated to the provider argv."""
    transition = contract()['transition']
    config_target = LIVE / 'config/astro.dev.config.mjs'
    payload = ROOT / 'config/astro.dev.config.mjs'
    require(sha(payload) == transition['external_dev_config']['to_sha256'], 'config payload hash')
    config_target.write_bytes(payload.read_bytes())
    require(sha(config_target) == transition['external_dev_config']['to_sha256'],
            'installed config result')
    compose_target = LIVE / 'compose.yaml'
    compose_target.write_bytes((ROOT / 'compose.yaml').read_bytes())
    require(sha(compose_target) == compose_result_hash(), 'installed compose result')


def restore_live_config():
    """Paired rollback of the live config/compose to the exact captured
    preimages (A3), verified before the app is touched."""
    transition = contract()['transition']
    rollback_bytes = ROLLBACK_DEV_CONFIG.encode()
    require(sha_bytes(rollback_bytes) == transition['external_dev_config']['from_sha256'],
            'rollback config preimage verified')
    capture = bundle_manifest()['preimage_capture']['files']['compose.yaml']
    rollback_compose = bundle_compose_preimage()
    require(sha_bytes(rollback_compose) == capture['sha256'] and len(rollback_compose) == capture['bytes'],
            'rollback compose preimage verified')
    config_target = LIVE / 'config/astro.dev.config.mjs'
    config_target.write_bytes(rollback_bytes)
    require(sha(config_target) == transition['external_dev_config']['from_sha256'],
            'rolled-back config preimage')
    compose_target = LIVE / 'compose.yaml'
    compose_target.write_bytes(rollback_compose)
    require(sha(compose_target) == capture['sha256'], 'rolled-back compose preimage')


def bundle_compose_preimage():
    """The exact captured compose preimage bytes (hash-verified against the
    capture record by every caller before use)."""
    return ROLLBACK_COMPOSE.encode()


def forward_anchor_state():
    """The state a rollback may be paired from: a completed apply, or any
    recorded interrupted forward stage at/after 'app-stopped' (A3)."""
    progress = read_progress()
    require(progress.get('operation') == 'apply', 'rollback pairing')
    require(progress.get('status') in ('complete', 'in-progress'), 'rollback pairing state')
    require('app-stopped' in progress.get('stages', []), 'rollback pairing stage')
    return progress


# ---------------------------------------------------------------------------
# Gate-B-gated live operations (never exercised in Gate A or its tests)
# ---------------------------------------------------------------------------

def apply():
    """Gate-B forward transition. NOT EXECUTED / NOT AUTHORIZED at Gate A.

    Order (A2): authority + bundle admission + preimages + token input
    validation + old-env read all happen BEFORE the app is stopped; then
    stop → source → config+compose install → token file → single
    replacement → bounded health → complete record."""
    verify_bundle()
    record = gate_b_authority('apply')
    transition = contract()['transition']
    state = verify_installed_preimages()
    source_guard(transition['source']['from_sha'])
    seed = SOURCE / 'seed/seed.json'
    require(sha(seed) == transition['protected_seed']['from_sha256'], 'protected seed preimage')
    read_private_env()
    token_value = read_token_input(record)
    resource_guard(state)
    old_app_id = current_app_id(state['containers']['app'])['Id']
    with lock():
        record_stage('authority', record, {'source_sha': transition['source']['from_sha'],
                                           'old_app_id': old_app_id})
        record_stage('preimages', record)
        try:
            stop_app(old_app_id)
            record_stage('app-stopped', record)
            git('checkout', '--detach', '--no-overwrite-ignore', transition['source']['to_sha'])
            source_guard(transition['source']['to_sha'])
            require(sha(seed) == transition['protected_seed']['to_sha256'], 'protected seed result')
            record_stage('source', record, {'source_sha': transition['source']['to_sha']})
            install_live_config()
            record_stage('config', record)
            record_stage('compose', record)
            write_token_file(token_value)
            record_stage('token-file', record)
            new_app = replace_app(old_app_id)
            record_stage('replacement', record, {'new_app_id': new_app['Id']})
            bounded_health_checks()
            record_stage('health', record)
            record_stage('complete', record)
            print('Reviewed forward transition applied; postgres/volumes/credentials untouched')
        except Exception:
            progress = read_progress(optional=True)
            where = progress['stages'][-1] if progress and progress.get('stages') else 'unknown'
            print(f'songhealth-dev maintenance: HOLD — partial state preserved at stage '
                  f'"{where}"; bounded rollback only under an explicit Gate B rollback record',
                  file=sys.stderr)
            raise


def rollback():
    """Gate-B paired rollback to the exact recorded source. NOT EXECUTED /
    NOT AUTHORIZED at Gate A. All rollback material (record pairing, live
    preimages, source/seed/config/compose preimage bytes, token-file
    presence, replacement binding) is validated BEFORE the app is stopped;
    a failed or unknown rollback stops for PO (no retry)."""
    verify_bundle()
    record = gate_b_authority('rollback')
    transition = contract()['transition']
    state = verify_installed_preimages()
    progress = forward_anchor_state()
    current_id = progress.get('new_app_id') or progress.get('old_app_id')
    require(current_id, 'rollback current app binding')
    source_guard(progress.get('source_sha') or transition['source']['to_sha'])
    seed = SOURCE / 'seed/seed.json'
    require(sha(seed) == transition['protected_seed']['to_sha256'], 'protected seed preimage')
    rollback_bytes = ROLLBACK_DEV_CONFIG.encode()
    require(sha_bytes(rollback_bytes) == transition['external_dev_config']['from_sha256'],
            'rollback config preimage verified')
    rollback_compose = bundle_compose_preimage()
    capture = bundle_manifest()['preimage_capture']['files']['compose.yaml']
    require(sha_bytes(rollback_compose) == capture['sha256'], 'rollback compose preimage verified')
    token_present = ROUTE_TOKEN_ENV.exists()
    read_private_env()
    with lock():
        record_stage('authority', {'operation': 'rollback', 'po_reference': record['po_reference'],
                                   'gate_a_candidate_sha': record['gate_a_candidate_sha']})
        try:
            current_app_id(current_id)
            stop_app(current_id)
            record_stage('app-stopped', {'operation': 'rollback',
                                         'po_reference': record['po_reference'],
                                         'gate_a_candidate_sha': record['gate_a_candidate_sha']})
            git('checkout', '--detach', '--no-overwrite-ignore', transition['source']['from_sha'])
            source_guard(transition['source']['from_sha'])
            require(sha(seed) == transition['protected_seed']['from_sha256'],
                    'protected seed rollback result')
            (LIVE / 'config/astro.dev.config.mjs').write_bytes(rollback_bytes)
            (LIVE / 'compose.yaml').write_bytes(rollback_compose)
            if token_present:
                ROUTE_TOKEN_ENV.unlink()
            new_app = replace_app(current_id)
            record_stage('replacement', {'operation': 'rollback',
                                         'po_reference': record['po_reference'],
                                         'gate_a_candidate_sha': record['gate_a_candidate_sha']},
                         {'new_app_id': new_app['Id'], 'source_sha': transition['source']['from_sha']})
            bounded_health_checks()
            record_stage('complete', {'operation': 'rollback',
                                      'po_reference': record['po_reference'],
                                      'gate_a_candidate_sha': record['gate_a_candidate_sha']})
            print('Reviewed paired rollback applied to the exact recorded source; '
                  'postgres/volumes/credentials untouched')
        except Exception:
            print('songhealth-dev maintenance: HOLD — rollback failed; state preserved; '
                  'STOP for Product Owner', file=sys.stderr)
            raise


def deliver_capability():
    """Gate-B-only: write the mode-0600 client copy from the private token
    input. The token moves from the record's token_input file to the
    SONGHEALTH_T021_ROUTE_ACCESS path; no value, hash or length is printed
    or recorded."""
    verify_bundle()
    record = gate_b_authority('deliver-capability')
    value = read_token_input(record)
    target = Path(os.environ['SONGHEALTH_T021_ROUTE_ACCESS'])
    require(target.parent.stat().st_uid == 1001, 'capability path owner')
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    require(not target.is_symlink(), 'capability path')
    fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'w') as handle:
        json.dump({'token': value}, handle)
        handle.write('\n')
    print('capability client copy written (mode 0600, UID1001); no secret material echoed')


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
            gate_b_authority(os.environ.get('SONGHEALTH_GATE_B_OPERATION', 'apply'))
            print('PASS: gate-b record binds this exact bundle and accepted candidate')
            return
        if args.operation == 'apply':
            apply()
        elif args.operation == 'rollback':
            rollback()
        else:
            deliver_capability()
    except (Refusal, OSError, ValueError, KeyError, TypeError, urllib.error.URLError) as error:
        print('songhealth-dev maintenance: HOLD — '
              + (str(error) if isinstance(error, Refusal) else 'operation failed; details withheld'),
              file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
