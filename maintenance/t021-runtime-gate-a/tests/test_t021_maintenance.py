"""Offline guard tests for the T021 Gate A maintenance bundle.

Standard library only; fake engine/git/filesystem/network throughout — no
runtime.sh command, no Podman/provider operation, no live private-state
read, no HTTP, no PAT, no database/media access, no second server and no
application test. Importing the captured controller copy in
preimage-sourcing tests happens with completely isolated constants.
"""
import hashlib
import importlib.util
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

spec = importlib.util.spec_from_file_location('t021_maintenance', BUNDLE / 'runtime.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


def fake_owned(path, private=False):
    p = Path(path)
    if not (p.exists() and not p.is_symlink()):
        raise r.Refusal('owned regular path')
    return p


OLD_ENV_LINES = [
    'SONGHEALTH_DEV_BOOTSTRAP_PASSWORD=' + 'a' * 64,
    'PGPASSWORD=' + 'b' * 64,
    'EMDASH_MIGRATION_DATABASE_URL=postgresql://songhealth_dev_app:' + 'b' * 64 + '@songhealth-dev-postgres:5432/songhealth_dev',
    'EMDASH_ENCRYPTION_KEY=emdash_enc_v1_' + 'c' * 43,
    'SONGHEALTH_DEV_GENERATION=' + 'd' * 32,
]
NEW_ENV_LINE = 'SONGHEALTH_T021_ROUTE_TOKEN=route_token_value_' + 'e' * 20


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
            r.verify_bundle.__doc__  # import already performed no access
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
        with patch.object(r, 'owned', side_effect=FileNotFoundError):
            with self.assertRaises((r.Refusal, OSError)):
                r.gate_b_authority('apply')


class ExactIdentityContract(unittest.TestCase):
    def test_source_pair_and_rollback_target(self):
        contract = json.loads((BUNDLE / 'maintenance-contract.json').read_text())
        source = contract['transition']['source']
        self.assertEqual(source['from_sha'], '6ab72780c1a531956acc3c06838c3028e10ad77d')
        self.assertEqual(source['to_sha'], 'e7e21d685563aded31ee9908320426dc7b4d9690')
        self.assertEqual(source['rollback_to'], source['from_sha'],
                         'paired rollback returns ONLY to the exact recorded source')

    def test_seed_and_config_hash_pairs_match_git_objects(self):
        contract = json.loads((BUNDLE / 'maintenance-contract.json').read_text())
        seed = contract['transition']['protected_seed']
        config = contract['transition']['external_dev_config']
        repo = BUNDLE.parents[1]
        for sha_ref, expected in [('6ab72780c1a531956acc3c06838c3028e10ad77d', seed['from_sha256']),
                                  ('e7e21d685563aded31ee9908320426dc7b4d9690', seed['to_sha256'])]:
            blob = subprocess.run(['/usr/bin/git', '-C', str(repo), 'show', f'{sha_ref}:seed/seed.json'],
                                  stdout=subprocess.PIPE, check=True,
                                  env={'PATH': '/usr/bin:/bin'}).stdout
            self.assertEqual(hashlib.sha256(blob).hexdigest(), expected)
        payload = (BUNDLE / 'config/astro.dev.config.mjs').read_bytes()
        self.assertEqual(len(payload), config['to_bytes'])
        self.assertEqual(hashlib.sha256(payload).hexdigest(), config['to_sha256'])
        rollback = r.ROLLBACK_DEV_CONFIG.encode()
        self.assertEqual(len(rollback), config['from_bytes'])
        self.assertEqual(hashlib.sha256(rollback).hexdigest(), config['from_sha256'])

    def test_proposed_compose_differs_by_exactly_the_new_key_line(self):
        proposed = (BUNDLE / 'compose.yaml').read_text()
        installed = PREIMAGES and (PREIMAGES / 'sources/compose.yaml').read_text()
        if installed is None:
            self.skipTest('preimages not provided')
        body = [line for line in proposed.splitlines()
                if line.strip() and not line.startswith('#')]
        added = [line for line in body if line not in installed.splitlines()]
        self.assertEqual(added, ['      SONGHEALTH_T021_ROUTE_TOKEN: ${SONGHEALTH_T021_ROUTE_TOKEN:?required}'])
        removed = [line for line in installed.splitlines() if line not in body]
        self.assertEqual(removed, [])
        self.assertIn('SONGHEALTH_T021_ROUTE_TOKEN', r.NEW_KEYS)
        self.assertTrue(re.fullmatch(r'[A-Z_][A-Z0-9_]*', r.NEW_KEY),
                        'digits in the key are accounted for by the grammar')

    def test_no_generic_promotion_or_destructive_verbs(self):
        import ast as ast_module
        tree = ast_module.parse((BUNDLE / 'runtime.py').read_text())
        code = '\n'.join(
            ast_module.unparse(node) for node in tree.body
            if not isinstance(node, ast_module.Expr))
        for forbidden in ["'promote'", "'exec'", "'reset'", "'volume','rm'", "'prune'",
                          "'system'", "'down'", "'down-'", "engine('rm'", "while True"]:
            self.assertNotIn(forbidden, code)


class GateBAuthorityContract(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.record_path = Path(self.tmp.name) / 'gate-b-record.json'
        self.manifest_sha = hashlib.sha256((BUNDLE / 'bundle-manifest.json').read_bytes()).hexdigest()

    def tearDown(self):
        self.tmp.cleanup()

    def write_record(self, **overrides):
        record = {
            'schema': 2, 'operation': 'apply',
            'gate_a_candidate_sha': 'f' * 40,
            'bundle_manifest_sha256': self.manifest_sha,
            'gate_a_review_reference': 'lead-pass', 'independent_review_reference': 'chatgpt',
            'po_reference': 'po-gate-b',
            'capture_preimages': json.loads((BUNDLE / 'maintenance-contract.json').read_text())
                ['preimage_capture']['recorded_containers'],
        }
        record.update(overrides)
        self.record_path.write_text(json.dumps(record))
        return self.record_path

    def test_valid_record_passes(self):
        with patch.object(r, 'owned', fake_owned), patch.object(r, 'GATE_B_RECORD', self.write_record()):
            r.gate_b_authority('apply')

    def _refuses(self, operation='apply', **overrides):
        with patch.object(r, 'owned', fake_owned), patch.object(r, 'GATE_B_RECORD', self.write_record(**overrides)):
            with self.assertRaises(r.Refusal):
                r.gate_b_authority(operation)

    def test_absent_record_refuses(self):
        with patch.object(r, 'owned', fake_owned), patch.object(r, 'GATE_B_RECORD', Path(self.tmp.name) / 'nope.json'):
            with self.assertRaises((r.Refusal, OSError)):
                r.gate_b_authority('apply')

    def test_wrong_operation_wrong_schema_missing_reference_stale_manifest_refuse(self):
        self._refuses(operation='rollback')                       # operation mismatch
        self._refuses(schema=1)                                   # wrong schema
        self._refuses(po_reference='')                            # missing reference
        self._refuses(bundle_manifest_sha256='0' * 64)            # stale bundle binding
        self._refuses(gate_a_candidate_sha='not-a-sha')           # malformed candidate

    def test_wrong_capture_preimage_binding_refuses(self):
        self._refuses(capture_preimages={'postgres': 'x', 'app': 'y'})

    def test_rollback_requires_paired_binding(self):
        with patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'GATE_B_RECORD', self.write_record(operation='rollback')):
            with self.assertRaises(r.Refusal):
                r.gate_b_authority('rollback')  # forward_record_sha256 missing
        with patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'GATE_B_RECORD', self.write_record(
                 operation='rollback', forward_record_sha256='a' * 64,
                 rollback_authorization='po-rollback')):
            r.gate_b_authority('rollback')


class PrivateInputContract(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.live = Path(self.tmp.name)
        self.env = self.live / 'runtime.env'
        self.env.write_text('\n'.join(OLD_ENV_LINES) + '\n')
        os.chmod(self.env, 0o600)

    def tearDown(self):
        self.tmp.cleanup()

    def read(self, require_new, lines=None):
        if lines is not None:
            self.env.write_text('\n'.join(lines) + '\n')
        with patch.object(r, 'LIVE', self.live), patch.object(r, 'owned', fake_owned):
            return r.read_private_env(require_new)

    def test_old_keys_valid_without_new_key(self):
        values = self.read(False)
        self.assertEqual(set(values), r.OLD_KEYS)

    def test_new_key_with_digits_accepted_and_required_after_transition(self):
        values = self.read(True, OLD_ENV_LINES + [NEW_ENV_LINE])
        self.assertEqual(values[r.NEW_KEY], NEW_ENV_LINE.split('=', 1)[1])
        self.env.write_text('\n'.join(OLD_ENV_LINES) + '\n')  # new key missing again
        with self.assertRaises(r.Refusal):
            self.read(True)

    def test_missing_old_key_arbitrary_key_and_bad_grammar_refuse(self):
        cases = [
            OLD_ENV_LINES[1:],                                              # missing required key
            OLD_ENV_LINES + ['ARBITRARY_KEY=value'],                        # not allowlisted
            OLD_ENV_LINES + ['BAD LINE'],                                   # grammar
            [*OLD_ENV_LINES[:2], 'EMDASH_ENCRYPTION_KEY=short',
             *OLD_ENV_LINES[3:]],                                           # value format
        ]
        for lines in cases:
            with self.assertRaises(r.Refusal):
                self.read(False, lines)

    def test_token_value_grammar_enforced(self):
        with self.assertRaises(r.Refusal):
            self.read(True, OLD_ENV_LINES + ['SONGHEALTH_T021_ROUTE_TOKEN=short'])


SEED_BLOBS = {}


def load_seed_blobs():
    repo = BUNDLE.parents[1]
    for label, sha_ref in [('old', '6ab72780c1a531956acc3c06838c3028e10ad77d'),
                           ('new', 'e7e21d685563aded31ee9908320426dc7b4d9690')]:
        result = subprocess.run(['/usr/bin/git', '-C', str(repo), 'show', f'{sha_ref}:seed/seed.json'],
                                stdout=subprocess.PIPE, check=True, env={'PATH': '/usr/bin:/bin'})
        SEED_BLOBS[label] = result.stdout


class FakeLiveTree:
    """Fake installed tree + scripted fake engine/git for transition tests."""

    def __init__(self, source_head):
        self.tmp = tempfile.TemporaryDirectory()
        self.live = Path(self.tmp.name)
        self.source = Path(self.tmp.name) / 'source'
        self.store = Path(self.tmp.name) / 'store.git'
        self.source.mkdir()
        self.store.mkdir()
        (self.source / 'seed').mkdir()
        self.source_head = source_head
        self.write_seed()
        (self.live / 'config').mkdir(parents=True)
        (self.live / 'config' / 'astro.dev.config.mjs').write_bytes(r.ROLLBACK_DEV_CONFIG.encode())
        self.state = {'complete': True,
                      'containers': {'app': 'old-app-id', 'postgres': 'pg-id'}}
        (self.live / 'state.json').write_text(json.dumps(self.state))
        self.calls = []
        self.source_head = source_head
        self.new_app_id = 'new-app-id'
        self.inspect_count = 0

    def cleanup(self):
        self.tmp.cleanup()

    def write_seed(self):
        label = 'old' if self.source_head.startswith('6ab72780') else 'new'
        (self.source / 'seed' / 'seed.json').write_bytes(SEED_BLOBS[label])

    def engine(self, *args, **kwargs):
        self.calls.append(('engine',) + args)
        if args[:2] == ('container', 'inspect'):
            self.inspect_count += 1
            if 'songhealth-dev-app' in args:
                which = 'old' if self.inspect_count % 2 == 1 else 'new'
                cid = self.state['containers']['app'] if which == 'old' else self.new_app_id
                return json.dumps([{'Id': cid,
                                    'State': {'Running': True},
                                    'Config': {'Env': [f'{r.NEW_KEY}=tok']}}]).encode()
            return json.dumps([{'Id': 'pg-id'}]).encode()
        if args[0] == 'stop':
            return b''
        raise AssertionError('unexpected engine call ' + ' '.join(args))

    def run(self, args, **kwargs):
        self.calls.append(('run',) + tuple(args))
        if tuple(args[1:4]) == ('--podman-path', r.PODMAN, '-p'):
            return b'compose-up-app'
        raise AssertionError('unexpected run call ' + ' '.join(map(str, args)))

    def git(self, *args, **kwargs):
        self.calls.append(('git',) + args)
        if args[:2] == ('rev-parse', 'HEAD'):
            return self.source_head
        if args[:1] == ('status',):
            return ''
        if args[:1] == ('symbolic-ref',):
            return ''
        if args[:2] == ('rev-parse', '--git-common-dir'):
            return str(r.STORE)
        if args[:1] == ('rev-parse',) and args[1:2] == ('--git-path',):
            return str(self.source / 'nonexistent')
        if args[:1] == ('checkout',):
            self.source_head = args[-1]
            self.write_seed()
            return ''
        raise AssertionError('unexpected git call ' + ' '.join(args))


class ForwardRollbackContract(unittest.TestCase):
    def setUp(self):
        load_seed_blobs()
        self.tree = FakeLiveTree('6ab72780c1a531956acc3c06838c3028e10ad77d')
        self.manifest_sha = hashlib.sha256((BUNDLE / 'bundle-manifest.json').read_bytes()).hexdigest()
        self.record = {
            'schema': 2, 'operation': 'apply', 'gate_a_candidate_sha': 'f' * 40,
            'bundle_manifest_sha256': self.manifest_sha,
            'gate_a_review_reference': 'lead', 'independent_review_reference': 'ir',
            'po_reference': 'po',
            'capture_preimages': json.loads((BUNDLE / 'maintenance-contract.json').read_text())
                ['preimage_capture']['recorded_containers'],
        }
        self.env_lines = OLD_ENV_LINES + [NEW_ENV_LINE]

    def tearDown(self):
        self.tree.cleanup()

    def apply(self, source_head=None, env_lines=None, state_complete=True):
        if source_head is not None:
            self.tree.source_head = source_head
        (self.tree.live / 'runtime.env').write_text('\n'.join(env_lines or self.env_lines) + '\n')
        self.tree.state['complete'] = state_complete
        (self.tree.live / 'state.json').write_text(json.dumps(self.tree.state))
        with patch.object(r, 'LIVE', self.tree.live), patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'SOURCE', self.tree.source), patch.object(r, 'STORE', self.tree.store), \
             patch.object(r, 'MAINT_STATE', self.tree.live / 'maint-state.json'), \
             patch.object(r, 'engine', self.tree.engine), patch.object(r, 'run', self.tree.run), \
             patch.object(r, 'git', self.tree.git), patch.object(r, 'read_private_env') as env_read, \
             patch.object(r, 'bounded_health_checks') as health, \
             patch.object(r, 'verify_installed_preimages') as preimages, \
             patch.object(r, 'gate_b_authority', return_value=self.record):
            env_read.return_value = {r.NEW_KEY: 'tok'}

            def guarded_preimages(_manifest=None):
                if not self.tree.state.get('complete'):
                    raise r.Refusal('installed runtime not complete')
                return dict(self.tree.state)

            preimages.side_effect = guarded_preimages
            r.apply()
        self.assertTrue(preimages.called, 'installed preimages verified before transition')
        return health

    def test_forward_positive_app_only_replacement(self):
        health = self.apply()
        engine_calls = [c for c in self.tree.calls if c[0] == 'engine']
        stopped = [c for c in engine_calls if c[1] == 'stop']
        self.assertEqual(len(stopped), 1, 'exactly one stop')
        self.assertEqual(stopped[0][2], 'old-app-id', 'the validated APP container only')
        for call in self.tree.calls:
            joined = ' '.join(map(str, call))
            self.assertNotIn('postgres', joined.replace('songhealth-dev-postgres', 'PGNAME'))
            self.assertNotIn('songhealth-dev-postgres', joined)
        config = (self.tree.live / 'config' / 'astro.dev.config.mjs').read_bytes()
        self.assertEqual(hashlib.sha256(config).hexdigest(),
                         '9e8bc3034423143ec0550efae3a72b0d8480b681db852b8f6fc570f7992a1c9d')
        checkouts = [c for c in self.tree.calls if c[0] == 'git' and c[1] == 'checkout']
        self.assertEqual([c[-1] for c in checkouts], ['e7e21d685563aded31ee9908320426dc7b4d9690'])
        health.assert_called_once()
        state = json.loads((self.tree.live / 'maint-state.json').read_text())
        self.assertEqual(state['operation'], 'apply')
        self.assertEqual(state['new_app_id'], 'new-app-id')
        self.assertEqual(state['source_sha'], 'e7e21d685563aded31ee9908320426dc7b4d9690')

    def test_wrong_source_head_refuses_before_any_mutation(self):
        with self.assertRaises(r.Refusal) as ctx:
            self.apply(source_head='0' * 40)
        self.assertEqual(str(ctx.exception), 'source HEAD')
        stopped = [c for c in self.tree.calls if c[0] == 'engine' and c[1] == 'stop']
        self.assertEqual(stopped, [], 'no stop before refusal')
        config = (self.tree.live / 'config' / 'astro.dev.config.mjs').read_bytes()
        self.assertEqual(hashlib.sha256(config).hexdigest(),
                         '14cafeaef2ced6052defdce9c8fea24ebec83e4864270e7e1e25523bd58dd48a')

    def test_incomplete_installed_state_refuses(self):
        with self.assertRaises(r.Refusal):
            self.apply(state_complete=False)
        stopped = [c for c in self.tree.calls if c[0] == 'engine' and c[1] == 'stop']
        self.assertEqual(stopped, [])

    def test_rollback_positive_exact_restore(self):
        record = dict(self.record, operation='rollback',
                      forward_record_sha256='a' * 64, rollback_authorization='po-rb')
        self.tree.source_head = 'e7e21d685563aded31ee9908320426dc7b4d9690'
        self.tree.write_seed()
        (self.tree.live / 'config' / 'astro.dev.config.mjs').write_bytes(
            (BUNDLE / 'config' / 'astro.dev.config.mjs').read_bytes())
        (self.tree.live / 'maint-state.json').write_text(json.dumps({
            'operation': 'apply', 'source_sha': 'e7e21d685563aded31ee9908320426dc7b4d9690'}))
        with patch.object(r, 'LIVE', self.tree.live), patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'SOURCE', self.tree.source), patch.object(r, 'STORE', self.tree.store), \
             patch.object(r, 'MAINT_STATE', self.tree.live / 'maint-state.json'), \
             patch.object(r, 'engine', self.tree.engine), patch.object(r, 'run', self.tree.run), \
             patch.object(r, 'git', self.tree.git), patch.object(r, 'read_private_env') as env_read, \
             patch.object(r, 'bounded_health_checks'), \
             patch.object(r, 'verify_installed_preimages', return_value=dict(self.tree.state)), \
             patch.object(r, 'gate_b_authority', return_value=record):
            env_read.return_value = {r.NEW_KEY: 'tok'}
            r.rollback()
        config = (self.tree.live / 'config' / 'astro.dev.config.mjs').read_bytes()
        self.assertEqual(hashlib.sha256(config).hexdigest(),
                         '14cafeaef2ced6052defdce9c8fea24ebec83e4864270e7e1e25523bd58dd48a')
        checkouts = [c for c in self.tree.calls if c[0] == 'git' and c[1] == 'checkout']
        self.assertEqual([c[-1] for c in checkouts], ['6ab72780c1a531956acc3c06838c3028e10ad77d'])
        state = json.loads((self.tree.live / 'maint-state.json').read_text())
        self.assertEqual(state['operation'], 'rollback')
        self.assertEqual(state['source_sha'], '6ab72780c1a531956acc3c06838c3028e10ad77d')

    def test_rollback_without_paired_forward_record_refuses(self):
        record = dict(self.record, operation='rollback',
                      forward_record_sha256='a' * 64, rollback_authorization='po-rb')
        self.tree.source_head = 'e7e21d685563aded31ee9908320426dc7b4d9690'
        with patch.object(r, 'LIVE', self.tree.live), patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'gate_b_authority', return_value=record):
            with self.assertRaises(r.Refusal):
                r.rollback()

    def test_rollback_wrong_source_refuses_before_mutation(self):
        record = dict(self.record, operation='rollback',
                      forward_record_sha256='a' * 64, rollback_authorization='po-rb')
        self.tree.source_head = '6ab72780c1a531956acc3c06838c3028e10ad77d'
        with patch.object(r, 'LIVE', self.tree.live), patch.object(r, 'owned', fake_owned), \
             patch.object(r, 'gate_b_authority', return_value=record):
            with self.assertRaises(r.Refusal):
                r.rollback()
        stopped = [c for c in self.tree.calls if c[0] == 'engine' and c[1] == 'stop']
        self.assertEqual(stopped, [])


class InstalledPreimageContract(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.live = Path(self.tmp.name)
        self.payload = (BUNDLE / 'config' / 'astro.dev.config.mjs').read_bytes()
        (self.live / 'config').mkdir(parents=True)
        (self.live / 'config' / 'astro.dev.config.mjs').write_bytes(self.payload)
        (self.live / 'state.json').write_text(json.dumps({'complete': True}))
        self.manifest = {'preimage_capture': {'files': {
            'config/astro.dev.config.mjs': {
                'sha256': hashlib.sha256(self.payload).hexdigest(),
                'bytes': len(self.payload)},
            'runtime.py': {'sha256': 'f' * 64, 'bytes': 1},
        }}}

    def tearDown(self):
        self.tmp.cleanup()

    def test_matching_preimages_return_state(self):
        with patch.object(r, 'LIVE', self.live), patch.object(r, 'owned', fake_owned):
            (self.live / 'runtime.py').write_bytes(b'x')
            self.manifest['preimage_capture']['files']['runtime.py'] = {
                'sha256': hashlib.sha256(b'x').hexdigest(), 'bytes': 1}
            state = r.verify_installed_preimages(self.manifest)
            self.assertTrue(state['complete'])

    def test_drift_refuses(self):
        (self.live / 'runtime.py').write_bytes(b'drifted')
        with patch.object(r, 'LIVE', self.live), patch.object(r, 'owned', fake_owned):
            with self.assertRaises(r.Refusal) as ctx:
                r.verify_installed_preimages(self.manifest)
            self.assertEqual(str(ctx.exception), 'installed preimage drift')

    def test_size_drift_and_incomplete_state_refuse(self):
        with patch.object(r, 'LIVE', self.live), patch.object(r, 'owned', fake_owned):
            (self.live / 'runtime.py').write_bytes(b'x')
            self.manifest['preimage_capture']['files']['runtime.py']['bytes'] = 2
            with self.assertRaises(r.Refusal):
                r.verify_installed_preimages(self.manifest)
        (self.live / 'state.json').write_text(json.dumps({'complete': False}))
        self.manifest['preimage_capture']['files']['runtime.py']['bytes'] = 1
        with patch.object(r, 'LIVE', self.live), patch.object(r, 'owned', fake_owned):
            with self.assertRaises(r.Refusal):
                r.verify_installed_preimages(self.manifest)


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
        engine = lambda *a, **k: json.dumps([{'Id': 'x', 'State': {'Running': True}}]).encode()
        with patch.object(r.urllib.request, 'urlopen', return_value=Response(marker)), \
             patch.object(r, 'engine', engine):
            r.bounded_health_checks({}, 'x')

    def test_missing_marker_fails_bounded(self):
        class Response:
            def read(self, _n):
                return b'<html>no marker</html>'

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        engine = lambda *a, **k: json.dumps([{'Id': 'x', 'State': {'Running': True}}]).encode()
        with patch.object(r.urllib.request, 'urlopen', return_value=Response()), \
             patch.object(r, 'engine', engine):
            with self.assertRaises(r.Refusal):
                r.bounded_health_checks({}, 'x')


class ProductionExclusionContract(unittest.TestCase):
    def test_bundle_paths_do_not_touch_canonical_config_or_containerfile(self):
        repo = BUNDLE.parents[1]
        containerfile = (repo / 'deploy' / 'Containerfile').read_text()
        self.assertNotIn('maintenance/', containerfile)
        self.assertNotIn('t021-runtime-gate-a', containerfile)
        canonical = (repo / 'astro.config.mjs').read_text()
        self.assertNotIn('cmsPublicReadsIntegration', canonical)

    def test_dev_config_payload_is_exactly_the_accepted_proposal(self):
        payload = (BUNDLE / 'config/astro.dev.config.mjs').read_text()
        self.assertIn("import foundation from '/app/astro.config.mjs';", payload)
        self.assertIn('root: \'/app\'', payload)
        self.assertIn('...foundation.vite', payload)
        self.assertIn('...foundation.vite?.server', payload)
        self.assertIn('strictPort: true', payload)
        self.assertIn('cmsPublicReadsIntegration()', payload)


original_read_bytes = Path.read_bytes


class CliEntryContract(unittest.TestCase):
    """CLI-level offline evidence: inert verbs work; live verbs refuse."""

    def cli(self, *args):
        return subprocess.run([sys.executable, str(BUNDLE / args[0]), *args[1:]],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              env={'PATH': '/usr/bin:/bin', 'T021_GATE_A_PREIMAGES':
                                   os.environ.get('T021_GATE_A_PREIMAGES', '')},
                              cwd=str(BUNDLE.parents[1]))

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
        self.assertEqual(plan['transition']['source']['to_sha'],
                         'e7e21d685563aded31ee9908320426dc7b4d9690')

    def test_live_verbs_refuse_without_gate_b_record(self):
        for verb in ['apply', 'rollback', 'deliver-capability']:
            result = self.cli('runtime.py', verb)
            self.assertEqual(result.returncode, 1, f'{verb} must refuse')
            self.assertIn('HOLD', result.stderr.decode())

    def test_installer_offline_fake_target_refuses_on_missing_preimages(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = self.cli('install-maintenance.py', '--target', tmp)
            self.assertEqual(result.returncode, 1)
            self.assertIn('HOLD', result.stderr.decode())


if __name__ == '__main__':
    unittest.main(verbosity=2)
