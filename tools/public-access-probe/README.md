# 公网访问验证探针

这个目录用于快速判断：当前机器上启动的后端服务，如果绑定到某个端口，是否能被公网访问。

探针服务只有一个 Python 文件，不依赖第三方包。它会监听指定端口，并在 `/health` 返回 JSON。公网侧能拿到 `200` 响应，就说明请求已经能从外部打到这台机器和这个端口。

## 1. 启动探针服务

在仓库根目录执行：

```bash
cd /home/qrh/data/code/OfferPilot
export PUBLIC_PROBE_TOKEN="$(openssl rand -hex 8)"
python3 tools/public-access-probe/server.py --port 18080
```

也可以换成你想验证的端口：

```bash
python3 tools/public-access-probe/server.py --port 8000
```

服务必须监听 `0.0.0.0`，不能只监听 `127.0.0.1`。本探针默认就是 `0.0.0.0`。

停止服务时按 `Ctrl+C`。

## 2. 先确认本机端口可用

在同一台机器上另开终端：

```bash
curl "http://127.0.0.1:18080/health?token=$PUBLIC_PROBE_TOKEN"
```

看到类似下面的 JSON，说明服务本身启动成功：

```json
{
  "ok": true,
  "message": "public-access-probe reachable"
}
```

如果本机都访问失败，先检查端口是否被占用、Python 进程是否还在运行：

```bash
ss -ltnp | grep ':18080'
```

## 3. 再确认局域网访问

探针启动时会打印类似下面的局域网测试地址：

```text
LAN check:   curl http://192.168.1.23:18080/health?token=...
```

在同一局域网的另一台设备上执行该命令。如果局域网也访问失败，通常是机器防火墙没有放行该端口。

常见检查命令：

```bash
sudo ufw status
sudo ufw allow 18080/tcp
```

如果系统使用 firewalld：

```bash
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=18080/tcp --permanent
sudo firewall-cmd --reload
```

测试完成后，如果不再需要这个端口，记得移除防火墙放行规则。

## 4. 获取公网 IP

在这台机器上执行：

```bash
curl -4s https://api.ipify.org && echo
```

或者：

```bash
curl -4s https://ifconfig.me && echo
```

假设返回的是 `203.0.113.10`，那么公网测试地址就是：

```text
http://203.0.113.10:18080/health?token=你的_TOKEN
```

## 5. 从公网侧测试

必须从这台机器之外的网络测试，例如：

- 手机关闭 Wi-Fi，使用移动网络访问测试地址
- 另一台云服务器执行 curl
- 让不在同一局域网的人帮忙执行 curl

示例：

```bash
curl -v --connect-timeout 5 "http://203.0.113.10:18080/health?token=$"
```

不要只在同一台机器上访问公网 IP 来判断结果。有些 NAT 环境支持回环访问，有些不支持，这个结果不能稳定代表真正公网可达。

## 6. 结果判断

`200 OK` 且返回 `"ok": true`：公网可以访问这台机器的该端口，可以继续评估后端部署。

`401 Unauthorized`：公网已经打到探针了，但 token 错了或没带。网络可达。

`Connection refused`：公网能到机器，但该端口没有服务监听，或被防火墙主动拒绝。

`Operation timed out` / `Connection timed out`：公网请求没有打到服务。常见原因包括云安全组未放行、系统防火墙未放行、路由器没有端口转发、机器没有公网 IP、运营商屏蔽入站连接。

`No route to host`：网络路由或防火墙策略阻断。

## 7. 云服务器和家用网络的额外检查

如果这是云服务器，还需要在云厂商控制台放行入站 TCP 端口，例如安全组、网络 ACL、防火墙策略。

如果这是家用或办公室网络，通常还需要在路由器上做端口转发：

```text
公网 TCP 18080 -> 当前机器内网 IP 的 TCP 18080
```

如果运营商没有给你真正的公网 IPv4，或者你处在 CGNAT 后面，即使本机服务正常，也无法直接通过公网 IPv4 入站访问。这种情况下可以考虑：

- 使用有公网 IP 的云服务器
- 使用 IPv6 并确认外部网络支持 IPv6
- 使用反向隧道或内网穿透
- 将后端部署到云平台或容器平台

## 8. 安全提醒

这个探针只用于临时连通性测试。测试时建议设置 `PUBLIC_PROBE_TOKEN`，测试完成后停止进程，并关闭临时开放的防火墙或安全组端口。
