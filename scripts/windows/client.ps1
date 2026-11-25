# Songhealth Windows client (Feature 016, #456; docs/operations/windows-client-runbook.md).
# The Product Owner runs it on their Windows 11 computer in PowerShell opened "as administrator"
# (Windows' own administrator prompt approves it); Claude Code never holds an administrator login.
# It installs nothing beyond what Windows ships, and every action has its removal.
#
#   .\client.ps1 -Action OpenChannel -PublicKey '<ssh-ed25519 ...>' -WorkstationAddress <address>
#       first time: turns on Windows' OpenSSH Server, makes the standard local account
#       songhealth-test that accepts only that key and may only forward to the two browsers'
#       debugging ports on this computer's loopback, and lets only the workstation reach port 22.
#       Later times: starts the server again.
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

function Remove-MarkedLines([string]$Path, [string]$Tag) {
    if (Test-Path $Path) {
        $kept = Get-Content $Path | Where-Object { $_ -notmatch [regex]::Escape($Tag) }
        Set-Content -Path $Path -Value $kept -Encoding ASCII
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
        $password = ConvertTo-SecureString ([Convert]::ToBase64String($bytes) + 'aA1!') -AsPlainText -Force
        New-LocalUser -Name $Account -Password $password -PasswordNeverExpires -UserMayNotChangePassword `
            -Description 'Songhealth acceptance tests: SSH tunnel to the test browsers only (removable)' | Out-Null
        Add-LocalGroupMember -Group 'Users' -Member $Account -ErrorAction SilentlyContinue
    }
    Set-Content -Path $KeyFile -Value $PublicKey -Encoding ASCII
    icacls $KeyFile /inheritance:r /grant 'SYSTEM:F' /grant 'Administrators:F' /grant "${Account}:R" | Out-Null
    Remove-MarkedLines $SshdConfig $Marker
    $config = Get-Content $SshdConfig
    $top = @("AllowUsers $Account $Marker")
    $match = @(
        "Match User $Account $Marker",
        "    AuthorizedKeysFile __PROGRAMDATA__/ssh/$Account`_authorized_keys $Marker",
        "    PasswordAuthentication no $Marker",
        "    AllowTcpForwarding local $Marker",
        "    PermitOpen 127.0.0.1:9222 127.0.0.1:9223 $Marker",
        "    PermitTTY no $Marker",
        "    X11Forwarding no $Marker",
        "    AllowAgentForwarding no $Marker"
    )
    Set-Content -Path $SshdConfig -Value ($top + $config + $match) -Encoding ASCII
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
    Remove-MarkedLines $SshdConfig $Marker
    if (Test-Path $KeyFile) { Remove-Item $KeyFile -Force }
    if (Get-LocalUser -Name $Account -ErrorAction SilentlyContinue) { Remove-LocalUser -Name $Account }
    $profileDir = Join-Path $env:SystemDrive "Users\$Account"
    Get-CimInstance Win32_UserProfile | Where-Object { $_.LocalPath -eq $profileDir } | Remove-CimInstance
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
    Remove-MarkedLines $HostsFile $HostsMarker
    $lines = $Names | ForEach-Object { "$MachineAddress $_ $HostsMarker" }
    Add-Content -Path $HostsFile -Value $lines -Encoding ASCII
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
