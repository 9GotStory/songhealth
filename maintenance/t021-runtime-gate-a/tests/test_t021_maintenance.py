"""Offline guard tests for the T021 Gate A maintenance bundle (corrective round 1).

Standard library only; fake engine/git/filesystem/network throughout — no
runtime.sh command, no Podman/provider operation, no live private-state
read, no HTTP, no PAT, no database/media access, no second server and no
application test. Every CLI case redirects the record path away from the
real private default; the captured original controller is imported only as
inert text with fully redirected constants.

Includes the corrected regressions for the Lead's nine defect probes
(01–09) as positive/negative expectations on the ACTUAL files, plus the
non-regression of the original safe controls.
"""
import contextlib
import fcntl
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

BUNDLE = Path(__file__).resolve().parents[1]
PREIMAGES = Path(os.environ.get('T021_GATE_A_PREIMAGES', '')) or None
CAPTURE = PREIMAGES / 'sources' if PREIMAGES else None

spec = importlib.util.spec_from_file_location('t021_maintenance', BUNDLE / 'runtime.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)

installer_spec = importlib.util.spec_from_file_location('t021_installer', BUNDLE / 'install-maintenance.py')
inst = importlib.util.module_from_spec(installer_spec)
installer_spec.loader.exec_module(inst)

legacy_spec = (importlib.util.spec_from_file_location('t021_captured_controller', CAPTURE / 'runtime.py')
               if CAPTURE and (CAPTURE / 'runtime.py').exists() else None)
legacy = importlib.util.module_from_spec(legacy_spec) if legacy_spec else None
if legacy is not None:
    legacy_spec.loader.exec_module(legacy)


def fake_owned(path, private=False):
    p = Path(path)
    if not (p.exists() and not p.is_symlink()):
        raise r.Refusal('owned regular path')
    return p


def seed_blob(label):
    source = r.contract()['transition']['source']
    sha_ref = source['from_sha'] if label in ('old', 'from') else source['to_sha']
    return subprocess.run(['/usr/bin/git', '-C', str(BUNDLE.parents[1]),
                           'show', f'{sha_ref}:seed/seed.json'], check=True,
                          stdout=subprocess.PIPE, env={'PATH': '/usr/bin:/bin'}).stdout


OLD_ENV_LINES = [
    'SONGHEALTH_DEV_BOOTSTRAP_PASSWORD=' + 'a' * 64,
    'PGPASSWORD=' + 'b' * 64,
    'EMDASH_MIGRATION_DATABASE_URL=postgresql://songhealth_dev_app:' + 'b' * 64 + '@songhealth-dev-postgres:5432/songhealth_dev',
    'EMDASH_ENCRYPTION_KEY=emdash_enc_v1_' + 'c' * 43,
    'SONGHEALTH_DEV_GENERATION=' + 'd' * 32,
]
OLD_ENV_TEXT = '\n'.join(OLD_ENV_LINES) + '\n'
TOKEN_VALUE = 'route_token_value_' + 'e' * 20


# ---------------------------------------------------------------------------
# Fake live tree: installed controller files + fake source + fake engine
# ---------------------------------------------------------------------------

class FakeTree:
    """Fake installed tree: every captured controller file present (captured
    bytes where the Lead captured content; synthetic private records whose
    hashes feed the synthetic capture manifest)."""

    def __init__(self, source_head='6ab72780c1a531956acc3c06838c3028e10ad77d'):
        self.tmp = tempfile.TemporaryDirectory()
        self.live = Path(self.tmp.name)
        self.source = self.live / 'source'
        self.store = self.live / 'store.git'
        self.source.mkdir()
        self.store.mkdir()
        (self.source / 'seed').mkdir()
        self.source_head = source_head
        self.write_seed()
        self.calls = []
        self.replacement_id = 'new-app-id'
        self.provider_generation = 0
        self.fail_stage = None
        self.state = {'complete': True, 'containers': {'app': 'old-app-id', 'postgres': 'pg-id'}}
        self.synthetic_capture = {}
        content_files = ['runtime.py', 'runtime.sh', 'compose.yaml',
                         'config/astro.dev.config.mjs', 'tests/test_runtime.py']
        for name in content_files:
            data = (CAPTURE / name).read_bytes()
            self.put(name, data)
            self.synthetic_capture[name] = {'sha256': hashlib.sha256(data).hexdigest(),
                                            'bytes': len(data)}
        for name in ['config/runtime.json', 'activation.json', 'source-state.json']:
            synthetic = json.dumps({'synthetic': name}).encode()
            self.put(name, synthetic)
            self.synthetic_capture[name] = {'sha256': hashlib.sha256(synthetic).hexdigest(),
                                            'bytes': len(synthetic)}
        # Every file of the captured installed manifest exists in the fake
        # tree (placeholders for artifacts whose bytes were not captured),
        # and the fake manifest.json is self-consistent with those files —
        # the original artifact_guard contract.
        captured_manifest = json.loads((CAPTURE / 'manifest.json').read_text())
        fake_manifest = {'schema': captured_manifest.get('schema'),
                         'source_sha': captured_manifest.get('source_sha'),
                         'status': captured_manifest.get('status'),
                         'files': {}, 'modes': dict(captured_manifest['modes'])}
        for name in captured_manifest['files']:
            target = self.live / name
            if not target.exists():
                self.put(name, f'placeholder for {name}\n'.encode())
            os.chmod(target, int(captured_manifest['modes'][name], 8))
            data = target.read_bytes()
            fake_manifest['files'][name] = hashlib.sha256(data).hexdigest()
        self.put('manifest.json', (json.dumps(fake_manifest, indent=2) + '\n').encode())
        self.synthetic_capture['manifest.json'] = {
            'sha256': hashlib.sha256((self.live / 'manifest.json').read_bytes()).hexdigest(),
            'bytes': (self.live / 'manifest.json').stat().st_size}
        self.put('state.json', json.dumps(self.state).encode())
        self.synthetic_capture['state.json'] = {
            'sha256': hashlib.sha256(json.dumps(self.state).encode()).hexdigest(),
            'bytes': len(json.dumps(self.state).encode())}
        self.put('runtime.env', OLD_ENV_TEXT.encode())

    def synthetic_manifest(self):
        manifest = json.loads((BUNDLE / 'bundle-manifest.json').read_text())
        manifest['preimage_capture']['files'] = dict(self.synthetic_capture)
        return manifest

    def put(self, name, data):
        target = self.live / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    def write_seed(self):
        label = 'old' if self.source_head.startswith('6ab7278') else 'new'
        self.put('source/seed/seed.json', seed_blob(label))

    def cleanup(self):
        self.tmp.cleanup()

    # -- fake engine ------------------------------------------------------
    def engine(self, *args, **kwargs):
        self.calls.append(('engine',) + args)
        if args[:2] == ('container', 'inspect'):
            name = args[2]
            if name == r.CONTAINERS['app']:
                cid = self.state['containers']['app']
                return json.dumps([{'Id': cid, 'State': {'Running': True},
                                    'Config': {'Env': [f'{r.NEW_KEY}={TOKEN_VALUE}']}}]).encode()
            return json.dumps([{'Id': self.state['containers']['postgres'],
                                'State': {'Running': True}}]).encode()
        if args[0] == 'volume':
            return json.dumps([{'Name': args[2]}]).encode()
        if args[0] == 'network':
            return json.dumps([{'Name': args[2]}]).encode()
        if args[0] == 'stop':
            if self.fail_stage == 'stop':
                raise r.Refusal('command failed; raw diagnostics withheld')
            return b''
        raise AssertionError('unexpected engine call ' + ' '.join(args))

    def run(self, args, **kwargs):
        self.calls.append(('run',) + tuple(args))
        if tuple(args[1:4]) == ('--podman-path', r.PODMAN, '-p'):
            if self.fail_stage == 'compose-up':
                raise r.Refusal('command failed; raw diagnostics withheld')
            self.provider_generation += 1
            self.state['containers']['app'] = f'{self.replacement_id}-{self.provider_generation}'
            return b'compose-up-app'
        raise AssertionError('unexpected run call ' + ' '.join(map(str, args)))

    def git(self, *args, **kwargs):
        self.calls.append(('git',) + args)
        if self.fail_stage == 'checkout' and args[:1] == ('checkout',):
            raise r.Refusal('command failed; raw diagnostics withheld')
        if args[:2] == ('rev-parse', 'HEAD'):
            return self.source_head
        if args[:1] == ('status',):
            return ''
        if args[:1] == ('symbolic-ref',):
            return ''
        if args[:2] == ('rev-parse', '--git-common-dir'):
            return str(self.store)
        if args[:2] == ('rev-parse', '--git-path',):
            return str(self.source / 'nonexistent')
        if args[:1] == ('checkout',):
            self.source_head = args[-1]
            self.write_seed()
            return ''
        raise AssertionError('unexpected git call ' + ' '.join(args))


def installer_owned(path, private=False):
    p = Path(path)
    if not (p.exists() and not p.is_symlink()):
        raise inst.Refusal('owned regular path')
    return p


class GateAFixtures:
    """Authority/preimage plumbing for forward/rollback/install tests."""

    def __init__(self, tree):
        self.tree = tree
        self.manifest_sha = hashlib.sha256((BUNDLE / 'bundle-manifest.json').read_bytes()).hexdigest()
        self.candidate_sha = 'f' * 40
        self.token_input = tree.live / 'private' / 'token-input'
        self.token_input.parent.mkdir(parents=True, exist_ok=True)
        self.token_input.write_text(TOKEN_VALUE)
        self.record = {
            'schema': 2, 'operation': 'apply', 'gate_a_candidate_sha': self.candidate_sha,
            'bundle_manifest_sha256': self.manifest_sha,
            'gate_a_review_reference': 'lead-pass', 'independent_review_reference': 'chatgpt',
            'po_reference': 'po-gate-b', 'token_input': str(self.token_input),
            'capture_preimages': r.contract()['preimage_capture']['recorded_containers'],
        }

    def install(self):
        """Run the ACTUAL installer on the fake tree (full semantics, UID
        checks skipped for the fake filesystem): validate-before-write →
        stage → manifest/activation rewrite → candidate record."""
        record = dict(self.record, operation='install')
        record_path = self.tree.live / 'maintenance/t021-gate-a/gate-b-record.json'
        record_path.parent.mkdir(parents=True, exist_ok=True)
        record_path.write_text(json.dumps(record))
        activation = json.loads((self.tree.live / 'activation.json').read_text())
        activation.update({'approved': True, 'po_reference': 'OFFLINE-INSTALL'})
        (self.tree.live / 'activation.json').write_text(json.dumps(activation))
        with patch.object(inst, 'owned', installer_owned):
            validated = inst.validate_before_write(self.tree.live, offline=False)
            staged = inst.stage(self.tree.live, offline=True)
            manifest_identity = inst.rewrite_manifest_and_activation(
                self.tree.live, json.loads((self.tree.live / 'manifest.json').read_text()),
                staged, offline=True)
            inst.write_candidate_record(self.tree.live, validated, offline=True)
        return manifest_identity, staged

    def record_path(self, **overrides):
        record = dict(self.record)
        record.update(overrides)
        self.last_overrides = dict(overrides)
        path = self.tree.live / 'maintenance/t021-gate-a/gate-b-record.json'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(record))
        return path

    def patches(self, extra_record=None):
        extra_record = extra_record if extra_record is not None \
            else getattr(self, 'last_overrides', None)
        return [
            patch.object(r, 'LIVE', self.tree.live),
            patch.object(r, 'SOURCE', self.tree.source),
            patch.object(r, 'STORE', self.tree.store),
            patch.object(r, 'GATE_B_RECORD', self.tree.live / 'maintenance/t021-gate-a/gate-b-record.json'),
            patch.object(r, 'MAINT_STATE', self.tree.live / 'maintenance/t021-gate-a/state.json'),
            patch.object(r, 'CANDIDATE_RECORD', self.tree.live / 'maintenance/t021-gate-a/candidate.json'),
            patch.object(r, 'ROUTE_TOKEN_ENV', self.tree.live / 'maintenance/t021-gate-a/route-token.env'),
            patch.object(r, 'RUNTIME_LOCK', self.tree.live / 'runtime.lock'),
            patch.object(r, 'owned', fake_owned),
            patch.object(r, 'bundle_manifest', lambda: self.tree.synthetic_manifest()),
            patch.object(r, 'engine', self.tree.engine),
            patch.object(r, 'run', self.tree.run),
            patch.object(r, 'git', self.tree.git),
            patch.object(r, 'record_path',
                         lambda: self.record_path(**(extra_record or {}))),
        ]

    def forward(self, fail_stage=None, health=None):
        if fail_stage is not None:
            self.tree.fail_stage = fail_stage
        self.record_path()
        with contextlib.ExitStack() as stack:
            for p in self.patches():
                stack.enter_context(p)
            stack.enter_context(patch.object(r, 'bounded_health_checks',
                                             health if health is not None else (lambda: None)))
            r.apply()

    def rollback(self, forward_record=None, health=None):
        overrides = {'operation': 'rollback',
                     'forward_record_sha256': forward_record,
                     'rollback_authorization': 'po-rollback'}
        self.record_path(**overrides)
        with contextlib.ExitStack() as stack:
            for p in self.patches(extra_record=overrides):
                stack.enter_context(p)
            stack.enter_context(patch.object(r, 'bounded_health_checks',
                                             health if health is not None else (lambda: None)))
            r.rollback()




original_read_bytes = Path.read_bytes


# ---------------------------------------------------------------------------
# Original safe controls (non-regression)
# ---------------------------------------------------------------------------

class InertPreparationContract(unittest.TestCase):
    def test_import_is_inert_and_offline_operations_touch_no_live_paths(self):
        self.assertNotEqual(r.ROOT, r.LIVE)
        with patch.object(r.subprocess, 'run', side_effect=AssertionError('subprocess')), \
             patch.object(r.urllib.request, 'urlopen', side_effect=AssertionError('network')), \
             patch.object(Path, 'read_bytes',
                           side_effect=lambda self: (_ for _ in ()).throw(
                               AssertionError(f'live read: {self}'))
                           if str(self).startswith('/home/multica-agent/.local/share/dev-runtimes')
                           else original_read_bytes(self)):
            record = json.loads((BUNDLE / 'maintenance-contract.json').read_text())
            self.assertEqual(record['authority']['accepted_t021_source'],
                             'e7e21d685563aded31ee9908320426dc7b4d9690')

    def test_verify_bundle_positive(self):
        with patch.object(r, 'owned', fake_owned):
            r.verify_bundle()

    def test_verify_bundle_refuses_tampered_artifact(self):
        with patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'sha', lambda p: '0' * 64):
            with self.assertRaises(r.Refusal) as ctx:
                r.verify_bundle()
            self.assertEqual(str(ctx.exception), 'bundle artifact hash')

    def test_offline_gate_b_check_without_record_refuses_before_live_access(self):
        with patch.object(r, 'owned', side_effect=FileNotFoundError), \
             patch.object(r, 'record_path', lambda: Path('/nonexistent/record.json')):
            with self.assertRaises((r.Refusal, OSError)):
                r.gate_b_authority('apply')


class ExactIdentityContract(unittest.TestCase):
    def test_source_pair_and_rollback_target(self):
        contract = json.loads((BUNDLE / 'maintenance-contract.json').read_text())
        source = contract['transition']['source']
        self.assertEqual(source['from_sha'], '6ab72780c1a531956acc3c06838c3028e10ad77d')
        self.assertEqual(source['to_sha'], 'e7e21d685563aded31ee9908320426dc7b4d9690')
        self.assertEqual(source['rollback_to'], source['from_sha'])

    def test_seed_config_and_compose_pairs_match_git_objects_and_capture(self):
        contract = json.loads((BUNDLE / 'maintenance-contract.json').read_text())
        seed = contract['transition']['protected_seed']
        config = contract['transition']['external_dev_config']
        compose = contract['transition']['compose_environment']
        for label, expected in [('from', seed['from_sha256']), ('to', seed['to_sha256'])]:
            self.assertEqual(hashlib.sha256(seed_blob(label)).hexdigest(), expected)
        payload = (BUNDLE / 'config/astro.dev.config.mjs').read_bytes()
        self.assertEqual(hashlib.sha256(payload).hexdigest(), config['to_sha256'])
        rollback = r.ROLLBACK_DEV_CONFIG.encode()
        self.assertEqual(hashlib.sha256(rollback).hexdigest(), config['from_sha256'])
        proposed = (BUNDLE / 'compose.yaml').read_bytes()
        self.assertEqual(hashlib.sha256(proposed).hexdigest(), compose['proposed_compose_sha256'])
        preimage = r.ROLLBACK_COMPOSE.encode()
        self.assertEqual(hashlib.sha256(preimage).hexdigest(), compose['proposed_compose_from_sha256'])

    def test_proposed_compose_differs_by_exactly_the_env_file_block(self):
        if CAPTURE is None:
            self.skipTest('preimages not provided')
        proposed = [line for line in (BUNDLE / 'compose.yaml').read_text().splitlines()
                    if line.strip() and not line.startswith('#')]
        installed = (CAPTURE / 'compose.yaml').read_text().splitlines()
        added = [line for line in proposed if line not in installed]
        self.assertEqual(added, ['    env_file:',
                                 '      - maintenance/t021-gate-a/route-token.env'])
        removed = [line for line in installed if line not in proposed]
        self.assertEqual(removed, [])

    def test_no_generic_promotion_or_destructive_verbs(self):
        import ast as ast_module
        tree = ast_module.parse((BUNDLE / 'runtime.py').read_text())
        code = '\n'.join(ast_module.unparse(node) for node in tree.body
                         if not isinstance(node, ast_module.Expr))
        for forbidden in ["'promote'", "'exec'", "'reset'", "'volume','rm'", "'prune'",
                          "'system'", "'down'", "'down-'", "engine('rm'", "while True"]:
            self.assertNotIn(forbidden, code)


class GateBAuthorityContract(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.candidate_path = Path(self.tmp.name) / 'candidate.json'
        self.candidate_path.write_text(json.dumps({
            'gate_a_candidate_sha': 'f' * 40,
            'bundle_manifest_sha256': hashlib.sha256(
                (BUNDLE / 'bundle-manifest.json').read_bytes()).hexdigest()}))
        self.tree = FakeTree()
        self.fixtures = GateAFixtures(self.tree)

    def tearDown(self):
        self.tmp.cleanup()
        self.tree.cleanup()

    def authority(self, operation, record_overrides=None, candidate=None):
        with patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'CANDIDATE_RECORD', candidate or self.candidate_path), \
             patch.object(r, 'MAINT_STATE', self.tree.live / 'maintenance/t021-gate-a/state.json'), \
             patch.object(r, 'record_path',
                          lambda: self.fixtures.record_path(**(record_overrides or {}))):
            return r.gate_b_authority(operation)

    def test_valid_record_passes(self):
        self.authority('apply')

    def _refuses(self, operation='apply', **overrides):
        with self.assertRaises(r.Refusal):
            self.authority(operation, overrides)

    def test_absent_wrong_operation_schema_reference_manifest_refuse(self):
        with patch.object(r, 'owned', side_effect=FileNotFoundError), \
             patch.object(r, 'record_path', lambda: Path(self.tmp.name) / 'nope.json'):
            with self.assertRaises((r.Refusal, OSError)):
                r.gate_b_authority('apply')
        self._refuses(operation='rollback')            # operation mismatch (no pairing)
        self._refuses(schema=1)
        self._refuses(po_reference='')
        self._refuses(bundle_manifest_sha256='0' * 64)
        self._refuses(gate_a_candidate_sha='not-a-sha')
        self._refuses(capture_preimages={'postgres': 'x', 'app': 'y'})

    def test_wrong_but_valid_candidate_sha_refuses(self):
        # Valid 40-hex candidate in the record, but the installer-recorded
        # accepted candidate is different → refuses on the BINDING check.
        with patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'CANDIDATE_RECORD', self.candidate_path), \
             patch.object(r, 'record_path', lambda: self.fixtures.record_path(
                 gate_a_candidate_sha='e' * 40)):
            with self.assertRaises(r.Refusal) as ctx:
                r.gate_b_authority('apply')
            self.assertEqual(str(ctx.exception), 'gate-b candidate binding')


class PrivateInputContract(unittest.TestCase):
    def setUp(self):
        self.tree = FakeTree()

    def tearDown(self):
        self.tree.cleanup()

    def read(self, lines=None):
        if lines is not None:
            self.tree.put('runtime.env', ('\n'.join(lines) + '\n').encode())
        with patch.object(r, 'LIVE', self.tree.live), patch.object(r, 'owned', fake_owned):
            return r.read_private_env()

    def test_runtime_env_five_reviewed_keys_only(self):
        values = self.read()
        self.assertEqual(set(values), r.OLD_KEYS)

    def test_missing_arbitrary_grammar_format_refuse(self):
        for lines in [OLD_ENV_LINES[1:],
                      OLD_ENV_LINES + ['ARBITRARY_KEY=value'],
                      OLD_ENV_LINES + ['SONGHEALTH_T021_ROUTE_TOKEN=' + TOKEN_VALUE],
                      OLD_ENV_LINES + ['BAD LINE'],
                      [*OLD_ENV_LINES[:2], 'EMDASH_ENCRYPTION_KEY=short', *OLD_ENV_LINES[3:]]]:
            with self.assertRaises(r.Refusal):
                self.read(lines)

    def test_token_input_missing_malformed_foreign_refuse(self):
        fixtures = GateAFixtures(self.tree)
        record = dict(fixtures.record)
        with patch.object(r, 'owned', fake_owned):
            self.assertEqual(r.read_token_input(record), TOKEN_VALUE)
        for overrides in [{'token_input': ''}, {'token_input': None},
                          {'token_input': str(self.tree.live / 'private' / 'absent')}]:
            with patch.object(r, 'owned', fake_owned):
                with self.assertRaises((r.Refusal, OSError)):
                    r.read_token_input({**record, **overrides})
        bad = self.tree.live / 'private' / 'bad-token'
        bad.write_text('short')
        with patch.object(r, 'owned', fake_owned):
            with self.assertRaises(r.Refusal) as ctx:
                r.read_token_input({**record, 'token_input': str(bad)})
            self.assertEqual(str(ctx.exception), 'route token value grammar')


class InstalledPreimageContract(unittest.TestCase):
    def setUp(self):
        self.tree = FakeTree()

    def tearDown(self):
        self.tree.cleanup()

    def verify(self):
        with patch.object(r, 'LIVE', self.tree.live), patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'MAINT_STATE', self.tree.live / 'maintenance/t021-gate-a/state.json'), \
             patch.object(r, 'bundle_manifest', lambda: self.tree.synthetic_manifest()):
            return r.verify_installed_preimages()

    def test_preinstall_capture_verify_passes(self):
        state = self.verify()
        self.assertTrue(state['complete'])

    def test_drift_size_and_incomplete_state_refuse(self):
        # Baseline verifies first (proves every captured file exists).
        self.verify()
        self.tree.put('config/astro.dev.config.mjs', b'drifted bytes')
        self.tree.synthetic_capture['config/astro.dev.config.mjs'] = {
            'sha256': hashlib.sha256(b'drifted bytes').hexdigest(), 'bytes': 999}
        with self.assertRaises(r.Refusal) as ctx:
            self.verify()
        self.assertIn(str(ctx.exception),
                      ['installed preimage drift', 'installed preimage size'])
        self.tree.put('config/astro.dev.config.mjs', r.ROLLBACK_DEV_CONFIG.encode())
        self.tree.synthetic_capture['config/astro.dev.config.mjs'] = {
            'sha256': hashlib.sha256(r.ROLLBACK_DEV_CONFIG.encode()).hexdigest(),
            'bytes': len(r.ROLLBACK_DEV_CONFIG)}
        self.tree.put('state.json', json.dumps({'complete': False}).encode())
        self.tree.synthetic_capture['state.json'] = {
            'sha256': hashlib.sha256(json.dumps({'complete': False}).encode()).hexdigest(),
            'bytes': len(json.dumps({'complete': False}).encode())}
        with self.assertRaises(r.Refusal) as ctx:
            self.verify()
        self.assertEqual(str(ctx.exception), 'installed runtime not complete')


class LockContract(unittest.TestCase):
    def test_second_concurrent_operation_refuses(self):
        with tempfile.TemporaryDirectory() as tmp:
            lock_path = Path(tmp) / 'runtime.lock'
            with patch.object(r, 'RUNTIME_LOCK', lock_path), patch.object(r, 'owned', fake_owned):
                with r.lock():
                    with self.assertRaises(r.Refusal) as ctx:
                        with r.lock():
                            pass
                    self.assertEqual(str(ctx.exception), 'another Songhealth operation is active')
                # Reacquirable after release
                with r.lock():
                    pass


class ResourceGuardContract(unittest.TestCase):
    def test_resource_admission_passes_and_drift_refuses(self):
        tree = FakeTree()
        try:
            with patch.object(r, 'engine', tree.engine):
                r.resource_guard({'containers': {'postgres': 'pg-id'}})
            with patch.object(r, 'engine', tree.engine):
                with self.assertRaises(r.Refusal) as ctx:
                    r.resource_guard({'containers': {'postgres': 'drifted-pg'}})
                self.assertEqual(str(ctx.exception), 'postgres resource identity')
        finally:
            tree.cleanup()

    def test_resource_guard_blocks_mutation_on_refusal(self):
        tree = FakeTree()
        try:
            fixtures = GateAFixtures(tree)
            fixtures.install()
            tree.state['containers']['postgres'] = 'drifted-pg'
            with self.assertRaises(r.Refusal):
                fixtures.forward()
            stopped = [c for c in tree.calls if c[0] == 'engine' and c[1] == 'stop']
            self.assertEqual(stopped, [], 'resource drift blocks before the app stop')
        finally:
            tree.cleanup()


class HealthCheckContract(unittest.TestCase):
    def test_bounded_check_accepts_marker(self):
        class Response:
            def __init__(self, body):
                self._body = body

            def read(self, _n):
                return self._body.encode()

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        marker = '<html><meta name="songhealth-foundation" content="public-runtime"/></html>'
        with patch.object(r.urllib.request, 'urlopen', return_value=Response(marker)):
            r.bounded_health_checks()

    def test_missing_marker_fails_bounded(self):
        class Response:
            def read(self, _n):
                return b'<html>no marker</html>'

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        with patch.object(r.urllib.request, 'urlopen', return_value=Response()):
            with self.assertRaises(r.Refusal):
                r.bounded_health_checks()


class ProductionExclusionContract(unittest.TestCase):
    def test_bundle_paths_do_not_touch_canonical_config_or_containerfile(self):
        repo = BUNDLE.parents[1]
        containerfile = (repo / 'deploy' / 'Containerfile').read_text()
        self.assertNotIn('maintenance/', containerfile)
        canonical = (repo / 'astro.config.mjs').read_text()
        self.assertNotIn('cmsPublicReadsIntegration', canonical)

    def test_dev_config_payload_is_exactly_the_accepted_proposal(self):
        payload = (BUNDLE / 'config/astro.dev.config.mjs').read_text()
        self.assertIn("import foundation from '/app/astro.config.mjs';", payload)
        self.assertIn("root: '/app'", payload)
        self.assertIn('...foundation.vite', payload)
        self.assertIn('...foundation.vite?.server', payload)
        self.assertIn('strictPort: true', payload)
        self.assertIn('cmsPublicReadsIntegration()', payload)


class CliEntryContract(unittest.TestCase):
    """CLI-level offline evidence with FULLY redirected record paths."""

    def cli(self, *args, record=None):
        env = {'PATH': '/usr/bin:/bin',
               'T021_GATE_A_PREIMAGES': os.environ.get('T021_GATE_A_PREIMAGES', '')}
        if record is not None:
            env['SONGHEALTH_GATE_B_RECORD'] = str(record)
        return subprocess.run([sys.executable, str(BUNDLE / args[0]), *args[1:]],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              env=env, cwd=str(BUNDLE.parents[1]))

    def test_verify_bundle_cli_passes(self):
        result = self.cli('runtime.py', 'verify-bundle')
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        self.assertIn('PASS: offline bundle hashes/modes verified', result.stdout.decode())

    def test_plan_cli_is_offline_and_lists_exact_identities(self):
        result = self.cli('runtime.py', 'plan')
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        plan = json.loads(result.stdout.decode())
        self.assertEqual(plan['transition']['source']['from_sha'],
                         '6ab72780c1a531956acc3c06838c3028e10ad77d')

    def test_live_verbs_refuse_with_isolated_record_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            absent = Path(tmp) / 'absent-record.json'
            for verb in ['apply', 'rollback', 'deliver-capability']:
                result = self.cli('runtime.py', verb, record=absent)
                self.assertEqual(result.returncode, 1, f'{verb} must refuse')
                self.assertIn('HOLD', result.stderr.decode())

    def test_installer_offline_fake_target_refuses_on_missing_preimages(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = self.cli('install-maintenance.py', '--target', tmp)
            self.assertEqual(result.returncode, 1)
            self.assertIn('HOLD', result.stderr.decode())


# ---------------------------------------------------------------------------
# Corrected regressions for the nine Lead probes (01–09)
# ---------------------------------------------------------------------------

class LeadProbeRegressions(unittest.TestCase):
    """Each case asserts the CORRECTED behavior on the actual files."""

    def setUp(self):
        self.tree = FakeTree()
        self.fixtures = GateAFixtures(self.tree)

    def tearDown(self):
        self.tree.cleanup()

    def test_01_install_integrity_manifest_admits_staged_files(self):
        manifest_identity, staged = self.fixtures.install()
        installed_manifest = json.loads((self.tree.live / 'manifest.json').read_text())
        for name, digest in staged.items():
            self.assertEqual(installed_manifest['files'][name], digest)
        candidate = json.loads(
            (self.tree.live / 'maintenance/t021-gate-a/candidate.json').read_text())
        self.assertEqual(candidate['gate_a_candidate_sha'], self.fixtures.candidate_sha)
        self.assertNotIn('maintenance/t021-gate-a/state.json', installed_manifest['files'])
        self.assertNotIn('maintenance/t021-gate-a/gate-b-record.json',
                         installed_manifest['files'])
        self.assertTrue(manifest_identity)

    # 01: install → preimage drift
    def test_01_actual_installer_then_admitted_forward_succeeds_and_drift_refuses(self):
        self.fixtures.install()
        # The forward path is ADMITTED after the reviewed installation (probe
        # 01's old 'installed preimage drift' refusal was the defect).
        self.fixtures.forward()
        self.assertEqual(self.tree.source_head, r.contract()['transition']['source']['to_sha'])
        progress = json.loads((self.tree.live / 'maintenance/t021-gate-a/state.json').read_text())
        self.assertEqual(progress['status'], 'complete')
        # Genuine drift still refuses truthfully.
        self.tree.put('runtime.sh', b'tampered') if (self.tree.live / 'runtime.sh').exists() \
            else self.tree.put('config/astro.dev.config.mjs', b'tampered')
        with self.assertRaises(r.Refusal) as ctx:
            self.fixtures.forward()
        self.assertIn(str(ctx.exception), ['installed preimage drift', 'applied config identity',
                                           'installed config result'])

    # 02: original artifact guard fails after install
    def test_02_original_artifact_guard_passes_after_install(self):
        if legacy is None:
            self.skipTest('captured controller not provided')
        self.fixtures.install()
        # Only the UID literal of the captured controller's owned() is
        # bypassed (a fake tree cannot be UID 1001); every hash/mode check
        # in artifact_guard runs against the real installed manifest.
        def legacy_owned(path, private=False):
            p = Path(path)
            if not (p.exists() and not p.is_symlink()):
                raise legacy.Refusal('owned regular path')
            return p

        with patch.object(legacy, 'ROOT', self.tree.live), \
             patch.object(legacy, 'owned', legacy_owned):
            legacy.artifact_guard()  # staged files match the installed manifest

    # 03: staged compose unused
    def test_03_provider_argv_uses_live_compose_now_containing_the_reviewed_key(self):
        self.fixtures.install()
        self.fixtures.forward()
        live_compose = (self.tree.live / 'compose.yaml').read_bytes()
        self.assertEqual(hashlib.sha256(live_compose).hexdigest(),
                         r.contract()['transition']['compose_environment']['proposed_compose_sha256'])
        provider_calls = [c for c in self.tree.calls if c[0] == 'run'
                          and tuple(c[2:5]) == ('--podman-path', r.PODMAN, '-p')]
        self.assertEqual(len(provider_calls), 1)
        self.assertIn(str(self.tree.live / 'compose.yaml'), ' '.join(provider_calls[0]))
        self.assertIn(b'route-token.env', live_compose)
        token_file = self.tree.live / 'maintenance/t021-gate-a/route-token.env'
        self.assertTrue(token_file.exists())
        self.assertNotIn(TOKEN_VALUE.encode(),
                         (self.tree.live / 'manifest.json').read_bytes())
        self.assertNotIn(TOKEN_VALUE.encode(), live_compose)

    # 04: rejected activation changes manifest
    def test_04_rejected_installation_leaves_preimages_untouched(self):
        record = dict(self.fixtures.record, operation='install')
        record_path = self.tree.live / 'maintenance/t021-gate-a/gate-b-record.json'
        record_path.parent.mkdir(parents=True, exist_ok=True)
        record_path.write_text(json.dumps(record))
        self.tree.put('activation.json', json.dumps(
            {'approved': False, 'po_reference': None, 'operations': []}).encode())
        manifest_before = (self.tree.live / 'manifest.json').read_bytes()
        activation_before = (self.tree.live / 'activation.json').read_bytes()
        stderr = io.StringIO()
        with patch.object(inst, 'owned', installer_owned), \
             patch.object(inst, 'verify_installed_preimages',
                          lambda live: json.loads((live / 'manifest.json').read_text())), \
             patch.object(inst, 'stage',
                          side_effect=AssertionError('stage must not run on rejection')), \
             patch.object(inst, 'rewrite_manifest_and_activation',
                          side_effect=AssertionError('rewrite must not run on rejection')), \
             patch.object(sys, 'argv', ['install-maintenance.py',
                                        '--target', str(self.tree.live)]), \
             contextlib.redirect_stderr(stderr):
            with self.assertRaises(SystemExit) as ctx:
                inst.main()
            self.assertEqual(ctx.exception.code, 1)
        self.assertIn('activation approval', stderr.getvalue())
        self.assertEqual((self.tree.live / 'manifest.json').read_bytes(), manifest_before)
        self.assertEqual((self.tree.live / 'activation.json').read_bytes(), activation_before)

    # 05: token input refused before stop
    def test_05_missing_or_malformed_token_input_blocks_before_stop(self):
        self.fixtures.install()
        broken = self.tree.live / 'private' / 'broken'
        broken.write_text('too-short')
        with patch.object(r, 'owned', fake_owned):
            with self.assertRaises(r.Refusal) as ctx:
                r.read_token_input({**self.fixtures.record, 'token_input': str(broken)})
            self.assertEqual(str(ctx.exception), 'route token value grammar')
        # Integrated: malformed input never reaches the stop.
        self.fixtures.record['token_input'] = str(broken)
        with self.assertRaises(r.Refusal):
            self.fixtures.forward()
        stopped = [c for c in self.tree.calls if c[0] == 'engine' and c[1] == 'stop']
        self.assertEqual(stopped, [])

    # 06: failure after stop leaves no record
    def test_06_failure_at_each_stage_records_truthful_progress(self):
        self.fixtures.install()
        for stage in ['checkout', 'compose-up']:
            tree = self.tree
            tree.fail_stage = stage
            try:
                with self.assertRaises(r.Refusal):
                    self.fixtures.forward()
                progress = json.loads(
                    (tree.live / 'maintenance/t021-gate-a/state.json').read_text())
                self.assertEqual(progress['status'], 'in-progress')
                self.assertIn('app-stopped', progress['stages'])
                self.assertNotIn('complete', progress['stages'])
            finally:
                tree.fail_stage = None

    # 07: wrong candidate / invalid unpaired hash accepted
    def test_07_wrong_candidate_and_fake_forward_hash_refuse(self):
        self.fixtures.install()
        # wrong-but-valid candidate
        with patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'CANDIDATE_RECORD',
                          self.tree.live / 'maintenance/t021-gate-a/candidate.json'), \
             patch.object(r, 'record_path',
                          lambda: self.fixtures.record_path(gate_a_candidate_sha='e' * 40)):
            with self.assertRaises(r.Refusal) as ctx:
                r.gate_b_authority('apply')
            self.assertEqual(str(ctx.exception), 'gate-b candidate binding')
        # invalid forward hash
        with patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'CANDIDATE_RECORD',
                          self.tree.live / 'maintenance/t021-gate-a/candidate.json'), \
             patch.object(r, 'MAINT_STATE', self.tree.live / 'maintenance/t021-gate-a/state.json'), \
             patch.object(r, 'record_path',
                          lambda: self.fixtures.record_path(
                              operation='rollback', forward_record_sha256='not-a-hash',
                              rollback_authorization='po')):
            with self.assertRaises(r.Refusal) as ctx:
                r.gate_b_authority('rollback')
            self.assertEqual(str(ctx.exception), 'gate-b forward record hash')

    # 08: rollback checks removed old app id
    def test_08_rollback_binds_recorded_replacement_and_restores_exact_state(self):
        self.fixtures.install()
        self.fixtures.forward()
        progress = json.loads((self.tree.live / 'maintenance/t021-gate-a/state.json').read_text())
        forward_hash = hashlib.sha256(
            json.dumps(progress, indent=2).encode() + b'\n').hexdigest()
        recorded_replacement = progress['new_app_id']
        self.fixtures.rollback(forward_record=forward_hash)
        # The stop targeted the RECORDED current (replacement) id.
        stopped = [c for c in self.tree.calls if c[0] == 'engine' and c[1] == 'stop']
        self.assertEqual(stopped[-1][2], recorded_replacement)
        self.assertEqual(self.tree.source_head,
                         r.contract()['transition']['source']['from_sha'])
        self.assertEqual(hashlib.sha256(
            (self.tree.live / 'config/astro.dev.config.mjs').read_bytes()).hexdigest(),
            r.contract()['transition']['external_dev_config']['from_sha256'])
        self.assertEqual(hashlib.sha256((self.tree.live / 'compose.yaml').read_bytes()).hexdigest(),
            r.contract()['transition']['compose_environment']['proposed_compose_from_sha256'])
        self.assertFalse((self.tree.live / 'maintenance/t021-gate-a/route-token.env').exists())
        rollback_progress = json.loads(
            (self.tree.live / 'maintenance/t021-gate-a/state.json').read_text())
        self.assertEqual(rollback_progress['operation'], 'rollback')

    # 08b: interrupted forward → paired rollback from the recorded stage
    def test_08b_rollback_from_interrupted_forward(self):
        self.fixtures.install()
        self.tree.fail_stage = 'compose-up'
        with self.assertRaises(r.Refusal):
            self.fixtures.forward()
        progress = json.loads((self.tree.live / 'maintenance/t021-gate-a/state.json').read_text())
        self.assertEqual(progress['status'], 'in-progress')
        forward_hash = hashlib.sha256(
            json.dumps(progress, indent=2).encode() + b'\n').hexdigest()
        self.tree.fail_stage = None
        self.fixtures.rollback(forward_record=forward_hash)
        self.assertEqual(self.tree.source_head,
                         r.contract()['transition']['source']['from_sha'])

    # 09: original env parser rejects the new key
    def test_09_original_env_parser_compatible_with_the_transition(self):
        if legacy is None:
            self.skipTest('captured controller not provided')
        # runtime.env keeps exactly the five reviewed keys; the digits key
        # never enters it, so the ORIGINAL parser accepts the transitioned
        # state unchanged.
        def legacy_owned(path, private=False):
            p = Path(path)
            if not (p.exists() and not p.is_symlink()):
                raise legacy.Refusal('owned regular path')
            return p

        with patch.object(legacy, 'ROOT', self.tree.live), \
             patch.object(legacy, 'owned', legacy_owned):
            values = legacy.env_read()
            self.assertEqual(set(values), r.OLD_KEYS)
        self.fixtures.install()
        self.fixtures.forward()
        # runtime.env is byte-identical after the whole transition.
        self.assertEqual((self.tree.live / 'runtime.env').read_bytes(), OLD_ENV_TEXT.encode())
        with patch.object(legacy, 'ROOT', self.tree.live), \
             patch.object(legacy, 'owned', legacy_owned):
            legacy.env_read()  # the ORIGINAL parser accepts the transitioned state

    # A4 extras: forward-record pairing must match the ACTUAL record
    def test_forward_record_must_hash_the_actual_progress_record(self):
        self.fixtures.install()
        self.fixtures.forward()
        stale = hashlib.sha256(b'stale-record').hexdigest()
        with self.assertRaises(r.Refusal) as ctx:
            self.fixtures.rollback(forward_record=stale)
        self.assertEqual(str(ctx.exception), 'gate-b forward record pairing')

    def test_foreign_or_stale_current_app_id_refuses(self):
        self.fixtures.install()
        self.fixtures.forward()
        progress = json.loads((self.tree.live / 'maintenance/t021-gate-a/state.json').read_text())
        progress['new_app_id'] = 'foreign-app'
        (self.tree.live / 'maintenance/t021-gate-a/state.json').write_text(
            json.dumps(progress, indent=2) + '\n')
        forward_hash = hashlib.sha256(
            json.dumps(progress, indent=2).encode() + b'\n').hexdigest()
        with self.assertRaises(r.Refusal) as ctx:
            self.fixtures.rollback(forward_record=forward_hash)
        self.assertEqual(str(ctx.exception), 'app container identity')

    def test_no_postgres_or_volume_actions_in_forward_and_rollback(self):
        self.fixtures.install()
        self.fixtures.forward()
        progress = json.loads(
            (self.tree.live / 'maintenance/t021-gate-a/state.json').read_text())
        forward_hash = hashlib.sha256(
            json.dumps(progress, indent=2).encode() + b'\n').hexdigest()
        self.fixtures.rollback(forward_record=forward_hash)
        mutating = [c for c in self.tree.calls
                    if not (c[0] == 'engine' and 'inspect' in c[1:3])
                    and not (c[0] == 'engine' and c[1] == 'stop')
                    and c[0] != 'git'
                    and c[0] != 'run']
        self.assertEqual(mutating, [], 'only admission reads, app stop, provider up and git checkout occurred')
        stops = [c for c in self.tree.calls if c[0] == 'engine' and c[1] == 'stop']
        ups = [c for c in self.tree.calls if c[0] == 'run']
        self.assertTrue(all(c[2].endswith('songhealth-dev-app') or 'app' in str(c[2])
                            for c in stops if len(c) > 2))
        self.assertLessEqual(len(ups), 2)  # one forward + one rollback replacement

    def test_no_secrets_in_stdout_stderr_or_state(self):
        self.fixtures.install()
        captured_out = io.StringIO()
        captured_err = io.StringIO()
        with contextlib.redirect_stdout(captured_out), contextlib.redirect_stderr(captured_err):
            self.fixtures.forward()
        progress = (self.tree.live / 'maintenance/t021-gate-a/state.json').read_text()
        for text in [captured_out.getvalue(), captured_err.getvalue(), progress]:
            self.assertNotIn(TOKEN_VALUE, text)
            self.assertNotIn(hashlib.sha256(TOKEN_VALUE.encode()).hexdigest(), text)


if __name__ == '__main__':
    unittest.main(verbosity=2)
