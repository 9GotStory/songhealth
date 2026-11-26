# The Windows client's self-test (#456 retro, Product Owner, #456 comment 7182354426): runs
# client.ps1 end to end on a throwaway CI runner, never on a person's computer. Both defects #456
# met (a 48-character limit on the account's description, a hosts file held by another process)
# reached the Product Owner's computer first; this run meets that kind of failure in CI.
#
#   powershell -ExecutionPolicy Bypass -File scripts/windows/ci-selftest.ps1     (as administrator)
#
# Each step names what it checks; the first failure stops the run with a non-zero exit.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'ci-selftest.ps1 changes the computer it runs on: CI runners only.' }

$Client = Join-Path $PSScriptRoot 'client.ps1'
$Work = Join-Path $env:RUNNER_TEMP 'songhealth-ci-selftest'
New-Item -ItemType Directory -Force $Work | Out-Null
$CaSubject = 'CN=Songhealth Rehearsal Internal Test CA (not for production)'

function Step([string]$Name) { Write-Output "== $Name" }
function Assert([bool]$Condition, [string]$What) {
    if (-not $Condition) { throw "FAIL: $What" }
    Write-Output "ok: $What"
}
function Invoke-Client([string[]]$Arguments) {
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $Client @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "client.ps1 $($Arguments -join ' ') failed (exit $LASTEXITCODE): $output" }
    $output | ForEach-Object { Write-Host "   $_" } # the host, so the function returns one string
    return ($output | Out-String)
}
# A native command's standard error, captured with 2>&1, is an error record in Windows PowerShell
# 5.1 and stops the script under 'Stop'; ssh's output is read as text here instead.
function Invoke-Ssh([string[]]$Arguments) {
    $ErrorActionPreference = 'Continue'
    return (& ssh @Arguments 2>&1 | ForEach-Object { "$_" } | Out-String)
}
function New-TestCertificateFile([string]$Subject, [string]$Path) {
    $certificate = New-SelfSignedCertificate -Subject $Subject -CertStoreLocation Cert:\CurrentUser\My `
        -KeyUsage CertSign, CRLSign -TextExtension @('2.5.29.19={critical}{text}ca=true&pathlength=0') -NotAfter (Get-Date).AddDays(2)
    Export-Certificate -Cert $certificate -FilePath $Path -Type CERT | Out-Null
    Remove-Item "Cert:\CurrentUser\My\$($certificate.Thumbprint)" -DeleteKey
}

Step 'a throwaway key for the channel'
$key = Join-Path $Work 'channel-key'
if (Test-Path $key) { Remove-Item "$key*" -Force }
& ssh-keygen -q -t ed25519 -N '""' -f $key -C 'songhealth ci-selftest'
if ($LASTEXITCODE -ne 0) { & ssh-keygen -q -t ed25519 -N '' -f $key -C 'songhealth ci-selftest' }
Assert (Test-Path "$key.pub") 'ssh-keygen made the key pair'
# ssh refuses a private key others can read.
icacls $key /inheritance:r /grant:r "${env:USERNAME}:F" | Out-Null
$publicKey = (Get-Content "$key.pub" -Raw).Trim()

Step 'OpenChannel'
$out = Invoke-Client @('-Action', 'OpenChannel', '-PublicKey', $publicKey, '-WorkstationAddress', '127.0.0.1')
Assert ($out -match 'Channel open') 'OpenChannel reports the channel open'
Assert ((Get-Service sshd).Status -eq 'Running') 'sshd runs'
& (Join-Path $env:SystemRoot 'System32\OpenSSH\sshd.exe') -t
Assert ($LASTEXITCODE -eq 0) 'sshd -t accepts the written sshd_config'
Assert ($null -ne (Get-LocalUser -Name 'songhealth-test' -ErrorAction SilentlyContinue)) 'the account exists'
$admins = @(Get-LocalGroupMember -SID 'S-1-5-32-544' | Where-Object { $_.Name -like '*\songhealth-test' })
Assert ($admins.Count -eq 0) 'the account is not an administrator'

Step 'OpenChannel again (a later session)'
$out = Invoke-Client @('-Action', 'OpenChannel', '-PublicKey', $publicKey, '-WorkstationAddress', '127.0.0.1')
$config = Get-Content (Join-Path $env:ProgramData 'ssh\sshd_config')
Assert (@($config | Where-Object { $_ -eq '# songhealth-test-channel begin' }).Count -eq 2) 'the channel blocks are written once, not added again'

Step 'the channel runs only the certificate check, and forwards only to the browsers'
$ssh = @('-i', $key, '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=NUL', '-o', 'BatchMode=yes', '-o', 'LogLevel=ERROR')
$answer = Invoke-Ssh ($ssh + @('songhealth-test@127.0.0.1', 'whoami'))
Write-Output $answer
if ($answer -match 'Permission denied') {
    # What the run needs to tell a key problem from a server one.
    $ErrorActionPreference = 'Continue'
    Write-Output '-- ssh -v (tail)'; Invoke-Ssh (@('-v') + $ssh + @('songhealth-test@127.0.0.1', 'whoami')) -split "`n" | Select-Object -Last 25
    Write-Output '-- the key loads without a passphrase'; & ssh-keygen -y -P '""' -f $key 2>&1 | ForEach-Object { "$_" }
    Write-Output '-- authorized keys file'; icacls (Join-Path $env:ProgramData 'ssh\songhealth-test_authorized_keys')
    Write-Output '-- OpenSSH events'; Get-WinEvent -LogName 'OpenSSH/Operational' -MaxEvents 15 -ErrorAction SilentlyContinue | ForEach-Object { $_.Message }
    Write-Output '-- sshd_config (non-comment)'; Get-Content (Join-Path $env:ProgramData 'ssh\sshd_config') | Where-Object { $_ -and $_ -notmatch '^\s*#' }
}
Assert ($answer -match 'songhealth\.moph\.go\.th:') 'any command runs check-tls.ps1 (ForceCommand)'
Assert ($answer -notmatch '\\songhealth-test\s*$') 'whoami itself did not run'
$forward = Invoke-Ssh ($ssh + @('-W', '127.0.0.1:445', 'songhealth-test@127.0.0.1'))
Write-Output $forward
Assert ($forward -match 'administratively prohibited') 'a forward outside PermitOpen is refused'

Step 'AddRehearsal'
$ca = Join-Path $Work 'ca.crt'
New-TestCertificateFile $CaSubject $ca
$other = Join-Path $Work 'other.crt'
New-TestCertificateFile 'CN=Not the rehearsal authority' $other
$refused = $false
try { Invoke-Client @('-Action', 'AddRehearsal', '-MachineAddress', '127.0.0.1', '-CaFile', $other) | Out-Null } catch { $refused = $true }
Assert $refused 'AddRehearsal refuses a certificate of another subject'
# A reader holding the hosts file open, as one did on the Product Owner's computer, for 2 s.
$hosts = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$job = Start-Job -ArgumentList $hosts -ScriptBlock {
    param($path)
    $stream = [IO.File]::Open($path, 'Open', 'Read', 'Read')
    Start-Sleep -Seconds 2
    $stream.Dispose()
}
Start-Sleep -Milliseconds 500
$out = Invoke-Client @('-Action', 'AddRehearsal', '-MachineAddress', '127.0.0.1', '-CaFile', $ca)
Receive-Job $job -Wait | Out-Null
Assert ($out -match 'Hosts entries added') 'AddRehearsal writes the hosts file while another process holds it'
$out = Invoke-Client @('-Action', 'AddRehearsal', '-MachineAddress', '127.0.0.1', '-CaFile', $ca)
$status = Invoke-Client @('-Action', 'Status')
Assert ($status -match 'sshd: Running') 'Status: sshd running'
Assert ($status -match 'account songhealth-test: present') 'Status: account present'
Assert ($status -match 'hosts entries: 2') 'Status: two hosts entries after AddRehearsal ran twice'
Assert ($status -match 'test CA in Trusted Root: 1') 'Status: the test CA trusted once'

Step 'RemoveRehearsal and RemoveChannel'
Invoke-Client @('-Action', 'RemoveRehearsal') | Out-Null
Invoke-Client @('-Action', 'RemoveChannel') | Out-Null
$status = Invoke-Client @('-Action', 'Status')
Assert ($status -match 'account songhealth-test: absent') 'Status: account removed'
Assert ($status -match 'hosts entries: 0') 'Status: hosts entries removed'
Assert ($status -match 'test CA in Trusted Root: 0') 'Status: test CA removed'
$config = Get-Content (Join-Path $env:ProgramData 'ssh\sshd_config')
Assert (@($config | Where-Object { $_ -match 'songhealth-test' }).Count -eq 0) 'sshd_config holds none of the channel lines'
Assert (-not (Test-Path (Join-Path $env:ProgramData 'ssh\songhealth-check-tls.ps1'))) 'the check''s copy removed'

Write-Output 'ci-selftest: PASS'
