포트를 차지하고 있는 기존 프로세스를 찾아 강제로 종료해야 합니다.

포트를 사용하는 프로세스 찾기

명령 프롬프트(cmd)나 PowerShell을 열고 아래 명령어를 입력하여 3000번 포트를 사용하는 프로세스의 **PID(프로세스 ID)**를 찾습니다.

Bash

netstat -ano | findstr "3000"
명령어를 실행하면 3000번 포트를 사용하는 프로세스의 PID가 마지막 열에 나타납니다.

프로세스 종료하기

위에서 찾은 PID 번호를 사용하여 아래 명령어로 해당 프로세스를 강제 종료합니다. (예: PID가 12345라면)

Bash

taskkill /F /PID 12345
[SUCCESS] 메시지가 뜨면 정상적으로 종료된 것입니다.

이제 다시 node server.js 명령어로 서버를 실행하면 정상적으로 작동할 것입니다.

///////////////////////////////////////////////////////////////////////

PS C:\Users\yati0\OneDrive\Desktop\KU\ASEC\2025_NURA_GCS\New_GCS\backend> node server.js // 서버 오픈

PS C:\Users\yati0\OneDrive\Desktop\KU\ASEC\2025_NURA_GCS\New_GCS\python_bridge> python decoder_main.py // 시리얼 포트 오픈

!! decoder_main.py + decoder.py 에 시리얼 포트 "COM11" 값은 장치관리자에서 확인 후 설정