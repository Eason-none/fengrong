# 云函数部署准备：把部署副本拷进 dist/build/mp-weixin 并配置 cloudfunctionRoot。
# 背景：开发者工具导入的项目根是 dist/build/mp-weixin，仓库根的 cloudfunctions/ 不在文件树里；
#       且 npm run build:mp-weixin 会冲掉 dist——每次要部署云函数前重跑本脚本即可。
# 注意：部署到控制台的函数名 = 文件夹名。llmProxy 的线上函数名是 fengrong（见 src/api/cloudFn.js），
#       所以副本目录必须叫 fengrong；reminder 线上就叫 reminder，原名拷贝。
$ErrorActionPreference = "Stop"
$dist = Join-Path $PSScriptRoot "..\dist\build\mp-weixin"
if (-not (Test-Path $dist)) { Write-Error "dist/build/mp-weixin 不存在，先 npm run build:mp-weixin"; exit 1 }

New-Item -ItemType Directory -Force (Join-Path $dist "cloudfunctions\fengrong") | Out-Null
Copy-Item (Join-Path $PSScriptRoot "..\cloudfunctions\llmProxy\*") (Join-Path $dist "cloudfunctions\fengrong\") -Force
New-Item -ItemType Directory -Force (Join-Path $dist "cloudfunctions\reminder") | Out-Null
Copy-Item (Join-Path $PSScriptRoot "..\cloudfunctions\reminder\*") (Join-Path $dist "cloudfunctions\reminder\") -Force

# JSON 补丁走 node：PS5.1 的 Out-File utf8 带 BOM，开发者工具解析不了会整个重生成配置、
# 把 cloudfunctionRoot 抹掉（2026-07-16 踩坑实录）；node 写出无 BOM、不重排。
$cfgPath = Join-Path $dist "project.config.json"
node -e "const fs=require('fs');const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.cloudfunctionRoot!=='cloudfunctions/'){j.cloudfunctionRoot='cloudfunctions/';fs.writeFileSync(p,JSON.stringify(j,null,2));console.log('project.config.json 已加 cloudfunctionRoot');}" $cfgPath
Write-Output "OK：dist 里的 cloudfunctions/fengrong 与 cloudfunctions/reminder 副本已就绪"
