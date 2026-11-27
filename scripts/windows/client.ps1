# Songhealth Windows client (Feature 016, #456; docs/operations/windows-client-runbook.md).
# The Product Owner runs it on their Windows 11 computer in PowerShell opened "as administrator"
# (Windows' own administrator prompt approves it); Claude Code never holds an administrator login.
# It installs nothing beyond what Windows ships, and every action has its removal.
#
#   .\client.ps1 -Action OpenChannel -PublicKey '<ssh-ed25519 ...>' -WorkstationAddress <address>
#       first time: turns on Windows' OpenSSH Server, makes the standard local account
#       songhealth-test that accepts only that key, may forward only to the two browsers' debugging
#       ports on this computer's loopback, and runs no command but the read-only certificate check
#       check-tls.ps1 (kept beside this script, copied where only administrators can change it),
#       and lets only the workstation reach port 22. Later times: starts the server again.
#   .\client.ps1 -Action CloseChannel           stops the SSH server between test sessions
#   .\client.ps1 -Action RemoveChannel          removes the account, its key and the server's rules
#   .\client.ps1 -Action AddRehearsal -MachineAddress <address> -CaFile <ca.crt>
#       the hosts-file entries for the rehearsal machine and trust in its Internal Test CA
#   .\client.ps1 -Action RemoveRehearsal        removes both again
#   .\client.ps1 -Action Status                 what of the above is in place
#
# No address, key or certificate is written into the repository: each is a parameter.
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('OpenChannel', 'CloseChannel', 'RemoveChannel', 'AddRehearsal', 'RemoveRehearsal', 'Status')]
    [string]$Action,
    [string]$PublicKey,
    [string]$WorkstationAddress,
    [string]$MachineAddress,
    [string]$CaFile
)
$ErrorActionPreference = 'Stop'

$Account = 'songhealth-test'
$SshDir = Join-Path $env:ProgramData 'ssh'
$SshdConfig = Join-Path $SshDir 'sshd_config'
$KeyFile = Join-Path $SshDir "$Account`_authorized_keys"
$CheckFile = Join-Path $SshDir 'songhealth-check-tls.ps1'
$Marker = '# songhealth-test-channel'
$HostsFile = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
$HostsMarker = '# songhealth-rehearsal'
$CaSubject = 'CN=Songhealth Rehearsal Internal Test CA (not for production)'
$Names = @('songhealth.moph.go.th', 'name-check.invalid')

function Assert-Administrator {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Run this in PowerShell opened as administrator.'
    }
}

# Well-known SIDs, so that the script also works where Windows names its groups in another language.
$System = '*S-1-5-18'
$Administrators = '*S-1-5-32-544'

function Set-ReadOnlyAcl([string]$Path, [string]$Reader) {
    icacls $Path /inheritance:r /grant "${System}:F" /grant "${Administrators}:F" /grant "${Reader}" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "icacls could not set the permissions of $Path (exit $LASTEXITCODE)" }
}

# Writes a whole file in one call, retrying for a few seconds: Set-Content in Windows PowerShell 5.1
# fails with "Stream was not readable" on the hosts file while another process holds it (seen on
# the Product Owner's computer, #456).
function Write-Lines([string]$Path, [string[]]$Lines) {
    for ($try = 1; ; $try++) {
        try { [IO.File]::WriteAllLines($Path, [string[]]@($Lines), [Text.Encoding]::ASCII); return }
        catch { if ($try -ge 10) { throw "could not write ${Path}: $($_.Exception.Message)" }; Start-Sleep -Milliseconds 500 }
    }
}

function Remove-MarkedLines([string]$Path, [string]$Tag) {
    if (Test-Path $Path) {
        $kept = Get-Content $Path | Where-Object { $_ -notmatch [regex]::Escape($Tag) }
        Write-Lines $Path $kept
    }
}

# sshd_config takes no comment after ForceCommand (the rest of the line is the command,
# sshd_config(5)), so the channel's lines sit between a begin and an end comment line instead.
function Remove-MarkedBlocks([string]$Path, [string]$Tag) {
    if (Test-Path $Path) {
        $inside = $false
        $kept = foreach ($line in Get-Content $Path) {
            if ($line -eq "$Tag begin") { $inside = $true; continue }
            if ($line -eq "$Tag end") { $inside = $false; continue }
            if (-not $inside) { $line }
        }
        Write-Lines $Path $kept
    }
}

function Open-Channel {
    if (-not $PublicKey -or $PublicKey -notmatch '^ssh-ed25519 [A-Za-z0-9+/=]+( .*)?$') { throw '-PublicKey needs the ssh-ed25519 public key line' }
    if (-not $WorkstationAddress) { throw '-WorkstationAddress needs the workstation''s private-network address' }
    $capability = Get-WindowsCapability -Online -Name 'OpenSSH.Server*'
    if ($capability.State -ne 'Installed') { Add-WindowsCapability -Online -Name $capability.Name | Out-Null }
    if (-not (Test-Path $SshdConfig)) { Start-Service sshd; Stop-Service sshd } # writes the default config
    if (-not (Get-LocalUser -Name $Account -ErrorAction SilentlyContinue)) {
        # A long random password nobody sees: the account signs in by its key alone.
        $bytes = New-Object byte[] 32
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        $password = New-Object Security.SecureString
        foreach ($character in ([Convert]::ToBase64String($bytes) + 'aA1!').ToCharArray()) { $password.AppendChar($character) }
        New-LocalUser -Name $Account -Password $password -PasswordNeverExpires -UserMayNotChangePassword `
            -Description 'Songhealth tests: SSH tunnel only (removable)' | Out-Null
        Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $Account -ErrorAction SilentlyContinue
    }
    # Newer OpenSSH Server installs ship sshd_config with
    # `AllowGroups administrators "openssh users"` and make that group (seen on the Windows Server
    # 2025 CI runner, OpenSSH_for_Windows_9.5, #456 retro); the account joins it, so sshd lets it in
    # there too.
    if (Get-LocalGroup -Name 'OpenSSH Users' -ErrorAction SilentlyContinue) {
        if (-not (Get-LocalGroupMember -Group 'OpenSSH Users' | Where-Object { $_.Name -like "*\$Account" })) {
            Add-LocalGroupMember -Group 'OpenSSH Users' -Member $Account
        }
    }
    Write-Lines $KeyFile @($PublicKey)
    Set-ReadOnlyAcl $KeyFile "${Account}:R"
    $source = Join-Path $PSScriptRoot 'check-tls.ps1'
    if (-not (Test-Path $source)) { throw "check-tls.ps1 must be in the same folder as this script" }
    Copy-Item $source $CheckFile -Force
    Set-ReadOnlyAcl $CheckFile "${Account}:RX"
    $previous = Get-Content $SshdConfig
    Remove-MarkedBlocks $SshdConfig $Marker
    $config = Get-Content $SshdConfig
    $top = @("$Marker begin", "AllowUsers $Account", "$Marker end")
    $match = @(
        "$Marker begin",
        "Match User $Account",
        "    AuthorizedKeysFile __PROGRAMDATA__/ssh/$Account`_authorized_keys",
        "    PasswordAuthentication no",
        "    AllowTcpForwarding local",
        "    PermitOpen 127.0.0.1:9222 127.0.0.1:9223",
        "    PermitTTY no",
        "    X11Forwarding no",
        "    AllowAgentForwarding no",
        "    ForceCommand powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$CheckFile`"",
        "$Marker end"
    )
    Write-Lines $SshdConfig ($top + $config + $match)
    # sshd's own test mode reads the new file; one it refuses is put back as it was.
    & (Join-Path $env:SystemRoot 'System32\OpenSSH\sshd.exe') -t
    if ($LASTEXITCODE -ne 0) {
        Write-Lines $SshdConfig $previous
        throw "sshd refuses the new sshd_config (exit $LASTEXITCODE); the previous one was put back"
    }
    $rule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
    if (-not $rule) {
        New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True `
            -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    }
    Set-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -RemoteAddress $WorkstationAddress -Enabled True
    Set-Service sshd -StartupType Manual
    Restart-Service sshd
    Write-Output "Channel open: sshd running, only $Account by its key, only from the workstation."
}

function Close-Channel {
    Stop-Service sshd -ErrorAction SilentlyContinue
    Write-Output 'Channel closed: sshd stopped.'
}

function Remove-Channel {
    Stop-Service sshd -ErrorAction SilentlyContinue
    Remove-MarkedBlocks $SshdConfig $Marker
    foreach ($file in @($KeyFile, $CheckFile)) { if (Test-Path $file) { Remove-Item $file -Force } }
    if (Get-LocalUser -Name $Account -ErrorAction SilentlyContinue) { Remove-LocalUser -Name $Account }
    $profileDir = Join-Path $env:SystemDrive "Users\$Account"
    try { Get-CimInstance Win32_UserProfile | Where-Object { $_.LocalPath -eq $profileDir } | Remove-CimInstance }
    catch { Write-Output "The account's profile is still in use; delete $profileDir after a restart." }
    if (Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue) {
        Set-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -Enabled False
    }
    Write-Output 'Channel removed: account, key and rules gone; OpenSSH Server stays installed but stopped.'
    Write-Output 'To uninstall it too: Remove-WindowsCapability -Online -Name (Get-WindowsCapability -Online -Name OpenSSH.Server*).Name'
}

function Add-Rehearsal {
    if (-not $MachineAddress) { throw '-MachineAddress needs the rehearsal machine''s private-network address' }
    if (-not $CaFile -or -not (Test-Path $CaFile)) { throw '-CaFile needs the Internal Test CA certificate file' }
    $certificate = New-Object Security.Cryptography.X509Certificates.X509Certificate2((Resolve-Path $CaFile).Path)
    if ($certificate.Subject -ne $CaSubject) { throw "The file is not the rehearsal's test CA ($($certificate.Subject))" }
    if ($certificate.HasPrivateKey) { throw 'The file holds a private key; only the certificate may come here.' }
    $kept = @(Get-Content $HostsFile | Where-Object { $_ -notmatch [regex]::Escape($HostsMarker) })
    $lines = $Names | ForEach-Object { "$MachineAddress $_ $HostsMarker" }
    Write-Lines $HostsFile ($kept + $lines)
    Import-Certificate -FilePath $CaFile -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
    ipconfig /flushdns | Out-Null
    Write-Output "Hosts entries added for $($Names -join ', '); test CA trusted until $($certificate.NotAfter.ToString('yyyy-MM-dd'))."
}

function Remove-Rehearsal {
    Remove-MarkedLines $HostsFile $HostsMarker
    Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -eq $CaSubject } | Remove-Item
    ipconfig /flushdns | Out-Null
    Write-Output 'Rehearsal hosts entries and test CA removed.'
}

function Show-Status {
    $service = Get-Service sshd -ErrorAction SilentlyContinue
    Write-Output ("sshd: " + $(if ($service) { $service.Status } else { 'not installed' }))
    Write-Output ("account ${Account}: " + $(if (Get-LocalUser -Name $Account -ErrorAction SilentlyContinue) { 'present' } else { 'absent' }))
    Write-Output ("hosts entries: " + @(Get-Content $HostsFile | Where-Object { $_ -match [regex]::Escape($HostsMarker) }).Count)
    Write-Output ("test CA in Trusted Root: " + @(Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -eq $CaSubject }).Count)
}

switch ($Action) {
    'OpenChannel' { Assert-Administrator; Open-Channel }
    'CloseChannel' { Assert-Administrator; Close-Channel }
    'RemoveChannel' { Assert-Administrator; Remove-Channel }
    'AddRehearsal' { Assert-Administrator; Add-Rehearsal }
    'RemoveRehearsal' { Assert-Administrator; Remove-Rehearsal }
    'Status' { Show-Status }
}
