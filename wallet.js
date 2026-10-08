(function () {
  const CFG = Object.assign({ chainId: 4663, chainName: "Robinhood Chain", rpc: "https://rpc.mainnet.chain.robinhood.com", explorer: "https://robinhoodchain.blockscout.com" }, window.PEBBLE_CONFIG || {});
  const W = { p: null, info: null, account: null, chainOk: false, providers: [] };
  const KEY = "pebble_wallet";
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const hexChain = "0x" + Number(CFG.chainId).toString(16);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  };

  window.addEventListener("eip6963:announceProvider", (e) => {
    const d = e.detail;
    if (!d || !d.info || !d.provider) return;
    if (!W.providers.some((q) => q.info.uuid === d.info.uuid || q.info.rdns === d.info.rdns)) W.providers.push(d);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  const emit = () => window.dispatchEvent(new CustomEvent("pebble:wallet", { detail: W }));

  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach((c) => c && e.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return e;
  }

  function modal(title, body, onClose) {
    const bg = el("div", { class: "pw-bg" });
    const m = el("div", { class: "pw-modal", role: "dialog", "aria-modal": "true", "aria-label": title });
    const close = () => { bg.remove(); document.removeEventListener("keydown", esc); if (onClose) onClose(); };
    const esc = (e) => { if (e.key === "Escape") close(); };
    m.appendChild(el("div", { class: "pw-head" }, [el("span", { text: title }), el("button", { class: "pw-x", "aria-label": "Close", text: "×", onclick: close })]));
    m.appendChild(body);
    bg.appendChild(m);
    bg.addEventListener("click", (e) => { if (e.target === bg) close(); });
    document.addEventListener("keydown", esc);
    document.body.appendChild(bg);
    return { close };
  }

  function niceError(e) {
    const m = String((e && (e.shortMessage || (e.data && e.data.message) || e.message)) || e);
    if ((e && e.code === 4001) || /reject|denied|cancel/i.test(m)) return "You cancelled the request.";
    if (/insufficient funds/i.test(m)) return "Not enough ETH for gas.";
    const custom = { NotOpen: "Converting has not opened yet.", BadProof: "This wallet is not on the convert list.", NothingToConvert: "Nothing new to convert yet. Wait for the next unlock." };
    for (const k in custom) if (m.includes(k)) return custom[k];
    return m.length > 160 ? m.slice(0, 160) + "..." : m;
  }

  async function ensureChain() {
    const id = await W.p.request({ method: "eth_chainId" });
    if (parseInt(id, 16) === Number(CFG.chainId)) { W.chainOk = true; return true; }
    try {
      await W.p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChain }] });
    } catch (e) {
      const code = e && (e.code || (e.data && e.data.originalError && e.data.originalError.code));
      if (code === 4902 || /unrecognized|not added|unknown chain/i.test(String(e && e.message))) {
        await W.p.request({ method: "wallet_addEthereumChain", params: [{ chainId: hexChain, chainName: CFG.chainName, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: [CFG.rpc], blockExplorerUrls: [CFG.explorer] }] });
      } else throw e;
    }
    const id2 = await W.p.request({ method: "eth_chainId" });
    W.chainOk = parseInt(id2, 16) === Number(CFG.chainId);
    return W.chainOk;
  }

  function attach(p) {
    if (!p || p._pwHooked || !p.on) return;
    p._pwHooked = true;
    p.on("accountsChanged", (acc) => {
      if (W.p !== p) return;
      W.account = acc && acc[0] ? acc[0].toLowerCase() : null;
      if (!W.account) store.set(KEY, null);
      emit();
    });
    p.on("chainChanged", (id) => { if (W.p !== p) return; W.chainOk = parseInt(id, 16) === Number(CFG.chainId); emit(); });
  }

  async function connectWith(p, info) {
    W.p = p; W.info = info;
    attach(p);
    const acc = await p.request({ method: "eth_requestAccounts" });
    const account = acc && acc[0] ? acc[0].toLowerCase() : null;
    if (!account) throw new Error("No account");
    W.account = account;
    store.set(KEY, info && info.rdns ? info.rdns : "injected");
    try { const id = await p.request({ method: "eth_chainId" }); W.chainOk = parseInt(id, 16) === Number(CFG.chainId); } catch (e) { W.chainOk = false; }
    emit();
    return account;
  }

  function deepLinks() {
    const url = location.href, hostPath = location.host + location.pathname + location.search;
    return [
      { name: "Bitget Wallet", href: "https://bkcode.vip?action=dapp&url=" + encodeURIComponent(url) },
      { name: "MetaMask", href: "https://metamask.app.link/dapp/" + hostPath },
      { name: "Trust Wallet", href: "https://link.trustwallet.com/open_url?coin_id=60&url=" + encodeURIComponent(url) },
      { name: "OKX Wallet", href: "okx://wallet/dapp/url?dappUrl=" + encodeURIComponent(url) },
      { name: "Coinbase Wallet", href: "https://go.cb-w.com/dapp?cb_url=" + encodeURIComponent(url) }
    ];
  }

  function legacy() {
    const out = [];
    const seen = new Set(W.providers.map((d) => d.provider));
    const add = (p, name, rdns) => { if (p && p.request && !seen.has(p)) { seen.add(p); out.push({ info: { name, rdns, icon: "" }, provider: p }); } };
    add(window.bitkeep && window.bitkeep.ethereum, "Bitget Wallet", "com.bitget.web3");
    add(window.okxwallet, "OKX Wallet", "com.okex.wallet");
    add(window.trustwallet && (window.trustwallet.ethereum || window.trustwallet), "Trust Wallet", "com.trustwallet.app");
    add(window.coinbaseWalletExtension, "Coinbase Wallet", "com.coinbase.wallet");
    const eth = window.ethereum;
    if (eth && Array.isArray(eth.providers)) eth.providers.forEach((p, i) => add(p, p.isMetaMask ? "MetaMask" : p.isCoinbaseWallet ? "Coinbase Wallet" : "Browser Wallet " + (i + 1), "injected." + i));
    if (eth) add(eth, eth.isBitKeep ? "Bitget Wallet" : eth.isOkxWallet ? "OKX Wallet" : eth.isTrust ? "Trust Wallet" : eth.isMetaMask ? "MetaMask" : "Browser Wallet", "injected");
    return out;
  }

  function picker() {
    return new Promise((resolve, reject) => {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      setTimeout(() => {
        const box = el("div", { class: "pw-body" });
        const list = el("div", { class: "pw-list" });
        const provs = W.providers.concat(legacy());
        let m, picked = false;
        provs.forEach((d) => {
          const ic = d.info.icon ? el("img", { src: d.info.icon, alt: "" }) : el("i", { text: d.info.name.charAt(0) });
          list.appendChild(el("button", {
            class: "pw-opt", type: "button", onclick: async () => {
              picked = true;
              m.close();
              try { resolve(await connectWith(d.provider, d.info)); } catch (e) { reject(new Error(niceError(e))); }
            }
          }, [ic, el("span", { text: d.info.name })]));
        });
        if (provs.length) box.appendChild(el("p", { text: provs.length > 1 ? "Choose your wallet:" : "Connect with:" }));
        else box.appendChild(el("p", { text: mobile ? "Open this page inside your wallet app:" : "No wallet found in this browser. Install a wallet extension, then reload this page." }));
        box.appendChild(list);
        if (mobile) {
          const apps = el("div", { class: "pw-list" });
          deepLinks().forEach((d) => apps.appendChild(el("a", { class: "pw-opt", href: d.href, rel: "noopener" }, [el("i", { text: d.name.charAt(0) }), el("span", { text: d.name }), el("small", { text: "Open app" })])));
          apps.appendChild(el("button", { class: "pw-opt", type: "button", onclick: () => { try { navigator.clipboard.writeText(location.href); } catch (e) {} } }, [el("i", { text: "+" }), el("span", { text: "Other wallet" }), el("small", { text: "Copy link" })]));
          if (provs.length) box.appendChild(el("p", { class: "pw-muted", text: "Or open this page in a wallet app:" }));
          box.appendChild(apps);
        }
        box.appendChild(el("p", { class: "pw-muted", text: "You will sign one free message to prove the wallet is yours. It can never move your funds." }));
        m = modal("Connect wallet", box, () => { if (!picked) resolve(null); });
      }, 250);
    });
  }

  async function connect() { if (W.account) return W.account; return picker(); }
  function disconnect() { W.p = null; W.info = null; W.account = null; W.chainOk = false; store.set(KEY, null); emit(); }

  async function autoReconnect() {
    const saved = store.get(KEY);
    if (!saved) return;
    await new Promise((r) => setTimeout(r, 350));
    const d = W.providers.concat(legacy()).find((q) => q.info.rdns === saved);
    if (!d) return;
    try {
      const acc = await d.provider.request({ method: "eth_accounts" });
      if (acc && acc[0]) {
        W.p = d.provider; W.info = d.info; W.account = acc[0].toLowerCase(); attach(d.provider);
        const id = await d.provider.request({ method: "eth_chainId" });
        W.chainOk = parseInt(id, 16) === Number(CFG.chainId);
        emit();
      }
    } catch (e) {}
  }

  async function sign(text) {
    if (!W.p || !W.account) throw new Error("Connect your wallet first.");
    const hex = "0x" + Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("");
    try { return await W.p.request({ method: "personal_sign", params: [hex, W.account] }); } catch (e) { throw new Error(niceError(e)); }
  }

  let rid = 1;
  async function rpc(method, params) {
    try {
      const r = await fetch(CFG.rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: rid++, method, params: params || [] }) });
      const j = await r.json();
      if (j.error) throw Object.assign(new Error(j.error.message || "RPC error"), { rpc: j.error });
      return j.result;
    } catch (e) {
      if (e.rpc || !W.p || !W.chainOk) throw e;
      return W.p.request({ method, params: params || [] });
    }
  }

  async function sendTx(to, data) {
    if (!W.account) { await connect(); if (!W.account) throw new Error("Wallet not connected."); }
    if (!W.chainOk) await ensureChain();
    try { return await W.p.request({ method: "eth_sendTransaction", params: [{ from: W.account, to, data }] }); } catch (e) { throw new Error(niceError(e)); }
  }

  async function waitTx(hash) {
    const end = Date.now() + 240000;
    while (Date.now() < end) {
      try {
        const r = await rpc("eth_getTransactionReceipt", [hash]);
        if (r) { if (r.status === "0x1") return r; throw new Error("Transaction failed on chain."); }
      } catch (e) { if (/failed on chain/.test(e.message)) throw e; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Still pending. Check the explorer.");
  }

  function chip(btn) {
    if (!btn) return;
    const paint = () => {
      btn.textContent = W.account ? W.account.slice(0, 6) + "..." + W.account.slice(-4) : "Connect";
      btn.classList.toggle("on", !!W.account);
    };
    btn.addEventListener("click", async () => {
      if (W.account) { disconnect(); return; }
      try { await connect(); } catch (e) {}
    });
    window.addEventListener("pebble:wallet", paint);
    paint();
  }

  window.PW = { state: W, cfg: CFG, connect, disconnect, sign, rpc, sendTx, waitTx, ensureChain, niceError, chip };
  autoReconnect();
})();
