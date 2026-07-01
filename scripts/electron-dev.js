const { spawn } = require('child_process')
const net = require('net')

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      const client = new net.Socket()
      client.once('connect', () => { client.destroy(); resolve() })
      client.once('error', () => {
        client.destroy()
        if (Date.now() - start > timeout) reject(new Error('timeout'))
        else setTimeout(check, 300)
      })
      client.connect(port, '127.0.0.1')
    }
    check()
  })
}

async function main() {
  console.log('Waiting for Vite dev server...')
  await waitForPort(5173)
  console.log('Starting Electron...')
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['electron', '.'],
    {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: 'http://localhost:5173' }
    }
  )
  child.on('close', () => process.exit())
}

main().catch(console.error)
