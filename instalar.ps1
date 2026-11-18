# Instala (ou remove) o mod biblioteca-prompts no Claude Code desta máquina.
#
# Uso:
#   .\instalar.ps1            instala o mod
#   .\instalar.ps1 -Remover   remove o mod
param(
    [switch]$Remover
)

$ErrorActionPreference = 'Stop'
$nome = 'biblioteca-prompts'
$pasta = $PSScriptRoot

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host 'O comando "claude" não foi encontrado.' -ForegroundColor Red
    Write-Host 'Instale o Claude Code e abra um novo terminal. Depois rode este script de novo.'
    exit 1
}

if ($Remover) {
    Write-Host "Removendo o mod $nome..."
    claude plugin uninstall $nome
    exit $LASTEXITCODE
}

Write-Host "Instalando o mod $nome a partir de:"
Write-Host "  $pasta"
Write-Host ''

# O Claude Code adiciona esta pasta como marketplace local e instala o mod
# no escopo do usuário. O mod passa a valer em todas as sessões novas.
claude plugin install $nome --marketplace $pasta --scope user
if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'A instalação falhou. Leia a mensagem acima.' -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Mod instalado.' -ForegroundColor Green
Write-Host 'Abra uma nova sessão do Claude Code e digite /biblioteca para abrir o painel.'
Write-Host ''
Write-Host 'Não mova nem apague esta pasta. O Claude Code lê o mod direto dela.'
