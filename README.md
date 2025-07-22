[Running] node "c:\Users\yati0\OneDrive\Desktop\KU\ASEC\2025_NURA_GCS\backend\server.js"
node:events:496
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1940:16)
    at listenInCluster (node:net:1997:12)
    at Server.listen (node:net:2102:7)
    at file:///c:/Users/yati0/OneDrive/Desktop/KU/ASEC/2025_NURA_GCS/backend/server.js:320:8
    at ModuleJob.run (node:internal/modules/esm/module_job:329:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:644:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1976:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '::',
  port: 3000
}

Node.js v22.17.0
-> 이런 에러가 뜬 경우 => 포트를 차지하고 있는 기존 프로세스를 찾아 강제로 종료해야 합니다.

포트를 사용하는 프로세스 찾기
명령 프롬프트(cmd)나 PowerShell을 열고 아래 명령어를 입력하여 3000번 포트를 사용하는 프로세스의 **PID(프로세스 ID)**를 찾습니다.
************
Bash
netstat -ano | findstr "3000" // 명령어를 실행하면 3000번 포트를 사용하는 프로세스의 PID가 마지막 열에 나타납니다.
************
프로세스 종료하기
위에서 찾은 PID 번호를 사용하여 아래 명령어로 해당 프로세스를 강제 종료합니다. (예: PID가 12345라면)
************
Bash
taskkill /F /PID 12345 // [SUCCESS] 메시지가 뜨면 정상적으로 종료된 것입니다.
************
이제 다시 node server.js 명령어로 서버를 실행하면 정상적으로 작동할 것입니다.

///////////////////////////////////////////////////////////////////////

PS .\2025_NURA_GCS\backend> node server.js // 서버 오픈

만약 오류가 발생한다면, decoder.py 에서 __name__의 COM 포트와 보드레이트를 확인하시오. // 본인의 장치관리자를 확인해 설정 (이건 정확한지 나도 몰루?)