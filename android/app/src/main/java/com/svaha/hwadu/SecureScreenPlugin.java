package com.svaha.hwadu;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 캡처 막기 — 인연 화면에서만.
 *
 * 형: 「왜 캡처 안 되게 했어? 인연만 캡처 안 되게 하는 건 어때」
 * 여태 MainActivity 가 앱 전체에 FLAG_SECURE 를 걸어 뒀다. 이제 웹이
 * 인연 방에 들어설 때 on(), 나올 때 off() 를 부른다.
 */
@CapacitorPlugin(name = "SecureScreen")
public class SecureScreenPlugin extends Plugin {
  @PluginMethod
  public void on(PluginCall call) {
    getActivity().runOnUiThread(() -> getActivity().getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE));
    call.resolve();
  }
  @PluginMethod
  public void off(PluginCall call) {
    getActivity().runOnUiThread(() -> getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE));
    call.resolve();
  }
}
