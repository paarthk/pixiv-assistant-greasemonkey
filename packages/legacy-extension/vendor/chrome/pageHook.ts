// This is how you break the extension/page sandboxing present in chrome.
// No this is not usually a good idea.
// I create a script tag with a receiver listening for a custom event type.
// Props are passed separately because serialization can be funky.

export function hijack(func: Function) {
    var script = document.createElement('script');
    script.appendChild(document.createTextNode(`(${func})();`));
    (document.body || document.head || document.documentElement).appendChild(script);
}

export function inject(func: Function) {
    hijack(func);
}

export function pixivExpose() {
    var evt = new CustomEvent('pixivExpose', {detail: (<any>window).pixiv.context});
    document.dispatchEvent(evt);
}

interface PixivExecDetails {
    id: number;
    func: (pixiv: any, props: any) => any;
    props: any;
}

export function pixivExec() {
    document.addEventListener('pixivExec', function(event) {
        let deets: PixivExecDetails = JSON.parse((<any>event).detail);
        let func = eval(`(${deets.func})`);
        let result = func((<any>window).globalInitData, deets.props);

        Promise.resolve(result).then(result => {
            let detailObject = {
                id: deets.id,
                response: result,
            };
            let evt = new CustomEvent('pixivExecResponse', {
                detail: detailObject,
            });
            document.dispatchEvent(evt);
        });
    });
}
