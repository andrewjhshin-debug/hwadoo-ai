package com.svaha.hwadu;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // 인연 카드의 얼굴은 앱 바깥으로 저장·화면 녹화되지 않게 한다.
    // 웹에서는 완전 차단이 불가능하지만, 설치형 Android 앱은 운영체제가
    // 스크린샷과 최근 앱 미리보기를 검게 처리하도록 맡길 수 있다.
    getWindow().setFlags(
      WindowManager.LayoutParams.FLAG_SECURE,
      WindowManager.LayoutParams.FLAG_SECURE
    );
  }
}
