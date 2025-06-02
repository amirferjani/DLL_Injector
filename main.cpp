#include <windows.h>
#include <tlhelp32.h>
#include <tchar.h>
#include <iostream>

DWORD GetProcId(const wchar_t* procName) {
    DWORD procId = 0;
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap != INVALID_HANDLE_VALUE) {
        PROCESSENTRY32 procEntry = {};
        procEntry.dwSize = sizeof(procEntry);
        if (Process32First(snap, &procEntry)) {
            do {
                if (!_wcsicmp(procEntry.szExeFile, procName)) {
                    procId = procEntry.th32ProcessID;
                    break;
                }
            } while (Process32Next(snap, &procEntry));
        }
    }
    CloseHandle(snap);
    return procId;
}

int main() {
    const wchar_t* targetProcess = L"CefSharp.BrowserSubprocess.exe"; // of notepad.exe
    const char* dllPath = "C:\\Users\\a.ferjani\\OneDrive - vzw Scholen Molenland\\Bureaublad\\test map\\InjectieDLL.dll";

    DWORD procId = GetProcId(targetProcess);
    if (procId == 0) {
        std::cout << "❌ Proces niet gevonden.\n";
        return 1;
    }

    HANDLE hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, procId);
    if (!hProc) {
        std::cout << "❌ Kan proces niet openen.\n";
        return 1;
    }

    void* loc = VirtualAllocEx(hProc, 0, MAX_PATH, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    WriteProcessMemory(hProc, loc, dllPath, strlen(dllPath) + 1, 0);
    HANDLE hThread = CreateRemoteThread(hProc, 0, 0,
        (LPTHREAD_START_ROUTINE)LoadLibraryA, loc, 0, 0);

    if (hThread) {
        std::cout << "✅ DLL geïnjecteerd!\n";
    } else {
        std::cout << "❌ Injectie mislukt.\n";
    }

    CloseHandle(hProc);
    return 0;
}
BN