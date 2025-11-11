function main(config) {
    // 根据名称排除节点
    removeNodeByName(config, /Premium/g);
    return config;
}

/**
 * 根据名称排除节点
 */
function removeNodeByName(config, regExp) {
    // 排除 proxies 中匹配的节点
    if (config.proxies && Array.isArray(config.proxies)) {
        config.proxies = config.proxies.filter(proxy => !proxy.name.match(regExp));
    }

    // 从 proxy-groups 中移除对应节点的引用
    if (config['proxy-groups'] && Array.isArray(config['proxy-groups'])) {
        config['proxy-groups'] = config['proxy-groups'].map(group => {
            if (group.proxies && Array.isArray(group.proxies)) {
                group.proxies = group.proxies.filter(name => !name.match(regExp));
            }
            return group;
        });
    }

    return config;
}