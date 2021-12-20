const wrapperEle = document.getElementById('wrapper');
const editorWrapperEle = document.getElementById('editor-wrapper');
const copyBtnEle = document.getElementById('copy-btn');
const tooltip = new bootstrap.Tooltip(copyBtnEle, { title: '点击复制', placement: 'left' });

const contentPromise = new Promise(async (resolve, reject) => {
  try {
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
        const {
          req_body_is_json_schema,
          req_body_other,
          res_body_is_json_schema,
          res_body,
        } = res?.data || {};
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

        const reqStr = req_body_is_json_schema ? await jstt.compile(JSON.parse(req_body_other || '{}'), 'Resquest', jsttCompileConfigOptions) : '';
        const resStr = res_body_is_json_schema ? await jstt.compile(JSON.parse(res_body || '{}'), 'Response', jsttCompileConfigOptions) : '';

        resolve([
          `/** 请求参数 */`,
          formatComment2SingleLine(reqStr),
          `/** 返回值 */`,
          formatComment2SingleLine(resStr)
        ].join('\n'))
      } else {
        reject(new Error(`缺少 id`));
      }
    } else reject(new Error(`非 chrome 插件环境 或 未获得 tabs 权限`));
  } catch (err) {
    console.err(err);
    reject(new Error(`获取数据失败`));
  }
})

copyBtnEle.addEventListener('click', async () => {
  try {
    const content = await contentPromise;
    await navigator.clipboard.writeText(content);
    tooltip.tip.querySelector('.tooltip-inner').textContent = '已复制';
  } catch(err) {
    if (typeof err === 'string') err = new Error(err || '复制失败');
    tooltip.tip.querySelector('.tooltip-inner').textContent = err?.message || '复制失败';
  }
});

require.config({ paths: { vs: 'lib/vs' } });

require(['vs/editor/editor.main'], async () => {
  try {
    const content = await contentPromise;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const isSystemDarkTheme = media.matches;

    const editor = monaco.editor.create(editorWrapperEle, {
      value: content,
      language: 'typescript',
      theme: isSystemDarkTheme ? 'vs-dark' : 'vs',
      readOnly: false,
      minimap: { enabled: false }
    });
    media.addEventListener('change', (e) => {
      const isCurrentSystemDarkTheme = e.matches;
      editor.updateOptions({ theme: isCurrentSystemDarkTheme ? 'vs-dark' : 'vs' })
    })
  } catch(err) {
    console.error(err);
    wrapperEle.innerHTML = `当前页面不可用！`;
    wrapperEle.classList.add('disabled')
  }
});

// ####################### utils #######################

function formatComment2SingleLine(content = '') {
  return content.replace(/\/\*([^/]*)\*\//mg, (_, p1) => `/** ${p1.replace(/[*\s\n]/gm, '')} */`)
}
