// 国内DNS服务器
// 说明：用于在中国大陆境内解析域名的 DoH（DNS over HTTPS）服务器，通常速度更快、解析更符合本地网络环境
const domesticNameservers = [
  "https://223.5.5.5/dns-query", // 阿里 DoH：阿里巴巴提供的公共 DNS，稳定可靠
  "https://doh.pub/dns-query" // 腾讯 DoH：腾讯提供的公共 DNS，延迟较低
];

// 国外DNS服务器
// 说明：用于访问境外网站的 DoH 服务器，结合规则可实现分流解析，避免国内外解析冲突
const foreignNameservers = [
  "https://208.67.222.222/dns-query", // OpenDNS：思科旗下，具有安全过滤能力
  "https://77.88.8.8/dns-query", // Yandex DNS：俄罗斯的公共 DNS，适用于特定区域
  "https://1.1.1.1/dns-query", // Cloudflare DNS：全球知名，速度快、隐私好
  "https://8.8.4.4/dns-query", // Google DNS：谷歌公共 DNS，覆盖全球节点
  "https://9.9.9.9/dns-query", // Quad9 DNS，具备恶意域名过滤特性
];

// DNS配置
// 说明：Clash 的 DNS 模块配置，决定域名如何被解析与缓存，影响代理与直连的行为
const dnsConfig = {
  // 是否启用 Clash 内置 DNS
  enable: true,
  // 本地监听地址与端口（如需与系统或其他服务共存可调整端口）
  listen: "0.0.0.0:1053",
  // 是否启用 IPv6 解析（如运营商不支持或网络环境复杂，可保持为 false）
  ipv6: true,
  // 是否优先使用 HTTP/3（部分 DoH 服务支持，若网络不稳定可保持 false）
  "prefer-h3": true,
  // 是否尊重路由规则进行分域名解析（开启后根据规则选择国内/国外 DNS）
  "respect-rules": true,
  // 是否使用系统 hosts 文件（关闭可避免与系统 hosts 冲突，由 Clash 统一管理）
  "use-system-hosts": false,
  // DNS 缓存算法（arc：自适应缓存策略，平衡命中率与内存占用）
  "cache-algorithm": "arc",
  // 启用增强模式的类型（fake-ip：为直连目标生成虚假 IP，解决某些代理/分流场景的域名解析问题）
  "enhanced-mode": "fake-ip",
  // fake-ip 的地址段（默认 Clash 推荐段，避免与真实地址冲突）
  "fake-ip-range": "198.18.0.1/16",
  // fake-ip 过滤列表：这些域名不使用 fake-ip，直接返回真实地址，避免服务异常
  "fake-ip-filter": [
    // 本地网络域名（局域网设备与服务）
    "+.lan",
    "+.local",
    // Windows 网络连通性检测（避免系统误判网络状态为断开）
    "+.msftconnecttest.com",
    "+.msftncsi.com",
    // QQ 快速登录相关（避免登录失败）
    "localhost.ptlogin2.qq.com",
    "localhost.sec.qq.com",
    // 追加以下条目：反向解析域、NTP 时间服务（避免被代理影响时间同步）
    "+.in-addr.arpa",
    "+.ip6.arpa",
    "time.*.com",
    "time.*.gov",
    "pool.ntp.org",
    // 微信企业登录（避免快速登录失败）
    "localhost.work.weixin.qq.com",
  ],
  // 系统默认 DNS（可改为运营商或本地网络更可靠的 DNS，如校园网/家庭宽带 DNS）
  "default-nameserver": ["223.5.5.5", "1.2.4.8"], // 可修改成自己 ISP 的 DNS
  // 常规解析使用的服务器（此处设置为国外 DoH，结合 respect-rules 与策略进行分流）
  nameserver: foreignNameservers,
  // 代理服务器自身的域名解析（代理节点域名解析走国内，提高连接速度与稳定性）
  "proxy-server-nameserver": domesticNameservers,
  // 直连目标的域名解析（直连流量走国内 DNS，避免被境外解析带来的绕路）
  "direct-nameserver": domesticNameservers,
  // 域名策略：为特定域分类指定解析服务器（如 CN/私有网走国内 DNS）
  "nameserver-policy": {
    // geosite:private,cn 表示私有网络与中国大陆域名
    "geosite:private,cn": domesticNameservers,
  },
};

// 主函数：配置处理（应用 DNS 配置并排除指定名称节点）
// 作用：将上述 DNS 配置写入传入的 Clash 配置对象，同时过滤掉名称中含有指定关键词的节点
function main(config) {
  // 基础校验：防止传入非对象导致运行时错误
  if (!config || typeof config !== "object") {
    throw new Error("无效的配置对象");
  }

  // 覆盖原配置中的 DNS 配置（将全局 DNS 行为切换为上述策略）
  config["dns"] = dnsConfig;

  // ===== TUN 模块增强设置 =====
  // 说明：
  // Clash 的 tun 功能可创建一个虚拟网卡，将系统/应用的流量强制导入 Clash，
  // 实现更完整的透明代理能力。以下设置确保：
  // 1. 若配置中尚未定义 tun，则初始化为空对象。
  // 2. stack 设为 "mixed"：同时支持系统的 IPv4 / IPv6 与 TCP / UDP。
  // 3. endpoint-independent-nat: 为 true 时允许在某些 NAT 网络环境中提高连接稳定性，
  //    改善部分游戏与通讯协议的体验。
  if (!config.tun) {
    config.tun = {};
  }
  // 采用混合协议栈（与多数使用场景兼容度高）
  config.tun.stack = "mixed";
  // 启用独立端点 NAT 行为（对需要稳定连接的服务更友好）
  config.tun["endpoint-independent-nat"] = true; // Add this

  // 排除名称中含有 "Premium" 的节点，并为保留的节点设置 udp = true
  // 说明：部分机场将「Premium」标注为特殊套餐或不可用节点，过滤可避免误用
  removeNodeByName(config, /Premium/);

  // 返回修改后的配置对象
  return config;
}

// 主函数：根据名称排除节点
// 说明：
// - 从 proxies 中删除名称匹配的节点
// - 同步从 proxy-groups 中移除其引用，避免组内存在无效条目
// - 在保留的节点上统一开启 UDP（对需要 UDP 的服务如某些游戏/通讯工具有帮助）
function removeNodeByName(config, regExp) {
  // 处理代理节点列表（proxies）
  const proxies = config.proxies;
  if (Array.isArray(proxies) && proxies.length > 0) {
    // 为所有有效节点设置 UDP
    for (const proxy of proxies) {
      if (proxy && typeof proxy === 'object' && proxy.name) {
        proxy.udp = true;
      }
    }
    // 过滤掉名称匹配正则的节点
    config.proxies = proxies.filter(proxy => proxy.name && !regExp.test(proxy.name));
  }

  // 同步更新代理组（proxy-groups）中的显式代理名单
  const proxyGroups = config['proxy-groups'];
  if (Array.isArray(proxyGroups) && proxyGroups.length > 0) {
    for (const group of proxyGroups) {
      if (Array.isArray(group.proxies) && group.proxies.length > 0) {
        // 从每个组的 proxies 列表中移除匹配名称的引用
        group.proxies = group.proxies.filter(name => name && !regExp.test(name));
      }
    }
  }

  // 返回更新后的配置对象
  return config;
}
