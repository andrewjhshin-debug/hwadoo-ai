package com.svaha.hwadu;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // 걸음 센서 — 화면 꺼져도 세는 포행(StepCounterPlugin)
    registerPlugin(StepCounterPlugin.class);
    // 캡처 막기 — 인연 방에서만(SecureScreenPlugin). 전체 FLAG_SECURE 는 걷었다
    registerPlugin(SecureScreenPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
