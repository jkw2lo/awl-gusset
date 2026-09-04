/* Handing the reader a file.

   This drafter was written as a Claude artifact, where the page runs in a sandboxed frame: a
   plain download link there does nothing at all, so the host lends the page a `downloads`
   capability and the drafter saves through that. Served as an ordinary page - from GitHub
   Pages, or opened straight off disk - there is no host and no sandbox, and the browser will
   do it itself.

   So this is the browser's own version of the same one-method contract the host provides:
   `save({filename, data})`, resolving when the file is handed over and rejecting with a
   `code` the caller already knows how to read. `wiring.js` picks whichever is available,
   which is how one source file keeps working in both places. */

const SAVE_FILE = {
  /** `data` is a string or an ArrayBuffer; the type comes from the name it is saved under. */
  async save({filename, data}){
    const TYPES = {json:'application/json', pdf:'application/pdf', html:'text/html',
                   svg:'image/svg+xml', txt:'text/plain'};
    const ext = String(filename).split('.').pop().toLowerCase();
    const blob = new Blob([data], {type: TYPES[ext] || 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    try{
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      a.style.position = 'absolute'; a.style.width = a.style.height = '1px'; a.style.opacity = '0';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }catch(err){
      // A browser that refuses a script-driven download - the caller's message for this is
      // "copy the text instead", which is exactly the right advice.
      const e = new Error('the browser would not take the file'); e.code = 'blocked'; throw e;
    }finally{
      // Revoked on the next turn of the loop: too early and the download has nothing to read.
      setTimeout(()=>URL.revokeObjectURL(url), 60000);
    }
  }
};
