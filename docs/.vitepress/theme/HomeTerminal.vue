<template>
  <div class="home-terminal">
    <div class="terminal">
      <div class="terminal-bar">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
        <div class="bar-title">agent.py</div>
      </div>
      <div class="terminal-body" ref="termEl"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const termEl = ref(null)

const lines = [
  { type: 'cmd', text: '$ python agent.py', delay: 45 },
  { type: 'blank' },
  { type: 'out', text: 'Agent initialized', delay: 30 },
  { type: 'out', text: 'Model: deepseek-chat', delay: 25 },
  { type: 'out', text: 'Tools: read_file, list_files, search_files', delay: 25 },
  { type: 'blank' },
  { type: 'val', text: '>>> 用一句话解释什么是 Agent。', delay: 30 },
  { type: 'blank' },
  { type: 'dim', text: 'Agent 是一个能感知环境、做出决策', delay: 20 },
  { type: 'dim', text: '并采取行动来完成目标的自主系统。', delay: 20 },
  { type: 'blank' },
  { type: 'out', text: 'Status: Ready ✓', delay: 30 },
]

onMounted(() => {
  let i = 0
  let charIdx = 0
  let currentSpan = null

  function render() {
    if (!termEl.value) return

    if (i >= lines.length) {
      setTimeout(() => {
        if (termEl.value) {
          termEl.value.innerHTML = ''
          i = 0; charIdx = 0; currentSpan = null
          render()
        }
      }, 2500)
      return
    }

    const line = lines[i]
    if (line.type === 'blank') {
      const div = document.createElement('div')
      div.className = 'terminal-line'
      div.innerHTML = '&nbsp;'
      termEl.value.appendChild(div)
      i++; setTimeout(render, 100); return
    }

    if (charIdx === 0) {
      const div = document.createElement('div')
      div.className = 'terminal-line'
      if (line.type === 'cmd') {
        const prompt = document.createElement('span')
        prompt.className = 'prompt'
        prompt.textContent = '❯ '
        div.appendChild(prompt)
      }
      currentSpan = document.createElement('span')
      currentSpan.className = `text-${line.type}`
      div.appendChild(currentSpan)
      termEl.value.appendChild(div)
    }

    if (charIdx < line.text.length) {
      currentSpan.textContent += line.text[charIdx]
      charIdx++
      setTimeout(render, line.delay || 30)
    } else {
      charIdx = 0; i++
      setTimeout(render, 120)
    }
  }

  render()
})
</script>

<style scoped>
.home-terminal {
  display: flex;
  justify-content: center;
  padding: 0 24px;
  width: 100%;
}

.terminal {
  width: 480px;
  min-width: 480px;
  height: 280px;
  background: #1a1f2b;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 8px 40px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
}

.terminal-bar {
  background: #252b38;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ff5f57; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

.bar-title {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  font-family: 'Inter', sans-serif;
}

.terminal-body {
  padding: 20px 20px 24px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 1.7;
  color: #b3b1ad;
  height: calc(280px - 40px);
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

:deep(.terminal-line) {
  margin-bottom: 4px;
}

:deep(.prompt) {
  color: #d97757;
}

:deep(.text-cmd) {
  color: #e8e6dc;
}

:deep(.text-out) {
  color: #788c5d;
}

:deep(.text-val) {
  color: #e5c07b;
}

:deep(.text-dim) {
  color: #5e5d59;
}
</style>
