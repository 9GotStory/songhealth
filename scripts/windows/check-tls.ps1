# Windows' own verification of the site's certificate (Feature 016, #456;
# docs/operations/windows-client-runbook.md). Needs no administrator: Claude Code runs it over the
# control channel as the standard account songhealth-test, sent as an encoded command:
#   ssh songhealth-test@<computer> powershell -NoProfile -EncodedCommand \
#     "$(iconv -t UTF-16LE check-tls.ps1 | base64 -w0)"
# For each name it resolves the name as this computer does (the hosts file included), opens TLS with
# that name, and builds the chain with Windows' chain engine (X509Chain, the machine's trust
# stores). It prints the issuer, the validity and Windows' verdict, never an address. The
# certificate only passes through memory: nothing is saved on this computer.
$ErrorActionPreference = 'Stop'
foreach ($name in @('songhealth.moph.go.th', 'name-check.invalid')) {
    try {
        $addresses = [System.Net.Dns]::GetHostAddresses($name)
        $resolved = if ($addresses.Count -gt 0) { 'resolves' } else { 'does not resolve' }
        $client = New-Object System.Net.Sockets.TcpClient($name, 443)
        $callback = [System.Net.Security.RemoteCertificateValidationCallback] {
            param($sender, $certificate, $chain, $errors)
            $script:presented = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certificate)
            return $true
        }
        $stream = New-Object System.Net.Security.SslStream($client.GetStream(), $false, $callback)
        $stream.AuthenticateAsClient($name)
        $presented = $script:presented
        $stream.Dispose(); $client.Dispose()
        $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
        $chain.ChainPolicy.RevocationMode = 'NoCheck'
        $valid = $chain.Build($presented)
        $status = ($chain.ChainStatus | ForEach-Object { $_.Status }) -join ','
        $sanMatch = $presented.GetNameInfo('DnsName', $false) -eq $name
        $verdict = if ($valid -and $sanMatch) { 'TRUSTED' } else { 'REFUSED' }
        Write-Output ("{0}: {1}; issuer '{2}'; valid to {3:yyyy-MM-dd}; Windows chain: {4} {5}" -f `
                $name, $resolved, $presented.Issuer, $presented.NotAfter, $verdict, $(if ($status) { "($status)" } else { '' }))
    }
    catch {
        Write-Output ("{0}: ERROR {1}" -f $name, ($_.Exception.Message -replace '\d{1,3}(\.\d{1,3}){3}', '<address>'))
    }
}
