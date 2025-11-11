function main(config) {
    // 根据名称排除节点 - 排除包含 "Premium" 的节点
    removeNodeByName(config, /Premium/i);
    return config;
}

function removeNodeByName(config, regExp) {
    // 过滤 proxies 数组
    if (config.proxies) {
        config.proxies = config.proxies.filter(proxy => !proxy.name.match(regExp));
    }

    // 过滤 proxy-groups 中的代理引用
    if (config['proxy-groups']) {
        config['proxy-groups'] = config['proxy-groups'].map(group => {
            if (group.proxies) {
                group.proxies = group.proxies.filter(name => !name.match(regExp));
            }
            return group;
        });
    }

    return config;
}