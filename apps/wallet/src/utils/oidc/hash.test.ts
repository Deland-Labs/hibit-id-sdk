import {expect, test} from 'vitest'
import {defaultScopes, getConfigHash} from "./hash.ts";


interface TestCaseData {
    issuerUri: string;
    clientId: string;
    expected: string;
    remark?: string;
}

const testCases: TestCaseData[] = [
    {
        issuerUri: 'https://testnetauth.hibit.app/',
        clientId: 'hibit_id_local',
        expected: '72f0ffff',
        remark: 'hash local client to staging auth server'
    },
    {
        issuerUri: 'https://localhost:44383/',
        clientId: 'hibit_id_local',
        expected: 'f6a53122',
        remark: 'hash local client to local auth server'
    },
    {
        issuerUri: 'https://testnetauth.hibit.app/',
        clientId: 'IdServer_HibitIdWeb',
        expected: 'ca5773f',
        remark: 'hash staging client to staging auth server'
    },
    {
        issuerUri: 'https://auth.hibit.app/',
        clientId: 'hibit_id_web',
        expected: 'bbaaa191',
        remark: 'production client to production auth server'
    },
]

test('hash generate and check', async () => {
    for (const testCase of testCases) {
        const hash = getConfigHash(testCase.issuerUri, testCase.clientId, null, defaultScopes);
        expect(hash).toBe(testCase.expected);
    }
})

