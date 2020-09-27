export const postBloom = async (filename: string, blah: Blob) => {
    const fd = new FormData();
    fd.append('thing', blah);

    fd.append('meta', JSON.stringify({
        name: filename,
        title: filename,
        attributes: [],
    }))
    const res = await fetch(`http://localhost:13183/drop`, {
        method: 'POST',
        body: fd,
    });
    return res;
}