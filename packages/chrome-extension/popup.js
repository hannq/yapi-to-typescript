const containerEle = document.getElementById('container');

(async function() {
   const contentPromise = new Promise(async (resolve, reject) => {
    if (chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [, host, id] = tab.url.match(/^([^:]*:\/\/[^/]*)\/project\/[^/]+\/interface\/api\/([^/]+)$/) || [];
      if (id) {
        const res = await fetch(`${host}/api/interface/get?id=${id}`, {
          "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
          },
          "method": "GET",
          "mode": "cors",
          "credentials": "include"
        }).then(res => res.json());

        const jsttCompileConfigOptions = {
          bannerComment: '',
          style: {
            bracketSpacing: false,
            printWidth: 120,
            semi: true,
            singleQuote: true,
            tabWidth: 2,
            trailingComma: 'none',
            useTabs: false,
          },
        }

        const reqStr = await jstt.compile(JSON.parse(res?.data?.req_body_other || '{}'), 'Resquest', jsttCompileConfigOptions);
        const resStr = await jstt.compile(JSON.parse(res?.data?.res_body || '{}'), 'Response', jsttCompileConfigOptions);

        resolve(`${reqStr}${resStr}`)
      } else {
        containerEle.innerHTML = `当前页面不可用`;
        containerEle.classList.add('disabled')
        reject(`缺少 id`);
      }
    } else resolve('');
  })

  require.config({ paths: { vs: 'lib/monaco-editor' } });
  
  require(['vs/editor/editor.main'], async () => {
    const content = await contentPromise;
    const isSystemDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    monaco.editor.create(containerEle, {
      value: content,
      language: 'typescript',
      theme: isSystemDarkTheme ? 'vs-dark' : 'vs',
      readOnly: true,
      minimap: { enabled: false }
    });
  });
})();
