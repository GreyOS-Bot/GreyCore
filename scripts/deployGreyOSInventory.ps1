[CmdletBinding()]
param(
    [string]$VpsHost = "greyos@82.165.185.179"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot "src\integrations\greyos\ProductProjectionPublisher.cjs"
$remoteStage = "/home/greyos/apps/GreyCore/.deploy-greyos-inventory/ProductProjectionPublisher.cjs"

if (-not (Test-Path -LiteralPath $source)) {
    throw "Source GreyCore introuvable."
}

& node --check $source
if ($LASTEXITCODE -ne 0) { throw "Validation locale GreyCore echouee." }

& ssh $VpsHost "mkdir -p /home/greyos/apps/GreyCore/.deploy-greyos-inventory"
if ($LASTEXITCODE -ne 0) { throw "Preparation distante impossible." }

& scp $source "${VpsHost}:$remoteStage"
if ($LASTEXITCODE -ne 0) { throw "Transfert GreyCore impossible." }

$remoteDeploy = @'
set -Eeuo pipefail
target=/home/greyos/apps/GreyCore/src/integrations/greyos/ProductProjectionPublisher.cjs
stage=/home/greyos/apps/GreyCore/.deploy-greyos-inventory/ProductProjectionPublisher.cjs
backup=/home/greyos/backups/greycore-greyos-inventory-$(date -u +%Y%m%dT%H%M%SZ).cjs

test "$(id -un)" = greyos
test -f "$target"
test -f "$stage"
node --check "$stage"
grep -q 'AGENT_VERSION = "1.8.0"' "$stage"
grep -q 'function inventoryPages' "$stage"
mkdir -p /home/greyos/backups
install -m 0600 "$target" "$backup"

rollback() {
  install -m 0644 "$backup" "$target" || true
  pm2 restart GreyCore --update-env >/dev/null || true
  echo GREYCORE_GREYOS_INVENTORY_ROLLBACK_COMPLETE
}
trap rollback ERR

install -m 0644 "$stage" "$target"
node --check "$target"
pm2 restart GreyCore --update-env >/dev/null
sleep 8
test "$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='GreyCore');process.stdout.write(p?.pm2_env?.status||'missing')})")" = online
pm2 save >/dev/null
trap - ERR
echo GREYCORE_GREYOS_INVENTORY_1.8.0_DEPLOYED
echo GREYCORE_BINDING_KEY_NOT_MODIFIED
'@

$remoteDeploy | & ssh $VpsHost "bash -s"
if ($LASTEXITCODE -ne 0) { throw "Deploiement GreyCore annule ou restaure." }

Write-Host "DEPLOIEMENT_GREYCORE_CONNECTEUR_TERMINE"
