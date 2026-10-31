package com.svaha.hwadu;

import android.Manifest;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * 걸음 센서 — 화면이 꺼져도 폰이 알아서 센다.
 *
 * 형: 「왜 잠금이나 다른 앱 사용 중에는 쓸 수 없지? 쓸 수 있도록 해」
 *
 * 웹은 화면이 꺼지면 가속도계를 못 받는다. 안드로이드의 TYPE_STEP_COUNTER 는
 * 부팅 뒤 누적 걸음을 폰이 저전력으로 세어 두는 값이라, 앱이 돌아왔을 때
 * 읽어서 아까 값과의 차이만 더하면 된다. 백그라운드 서비스가 필요 없다.
 *
 * read() 는 센서에 귀를 한 번 대고 첫 값을 받자마자 뗀다.
 * 안드로이드 10(Q)부터는 ACTIVITY_RECOGNITION 권한이 있어야 값이 온다.
 */
@CapacitorPlugin(
  name = "StepCounter",
  permissions = { @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION }) }
)
public class StepCounterPlugin extends Plugin {

  @PluginMethod
  public void read(PluginCall call) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && getPermissionState("activity") != PermissionState.GRANTED) {
      requestPermissionForAlias("activity", call, "afterPermission");
      return;
    }
    readNow(call);
  }

  @PermissionCallback
  private void afterPermission(PluginCall call) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && getPermissionState("activity") != PermissionState.GRANTED) {
      JSObject out = new JSObject();
      out.put("available", false);
      out.put("denied", true);
      call.resolve(out);
      return;
    }
    readNow(call);
  }

  private void readNow(final PluginCall call) {
    final SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    final Sensor sensor = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    if (sensor == null) {
      JSObject out = new JSObject();
      out.put("available", false);
      call.resolve(out);
      return;
    }
    final Handler handler = new Handler(Looper.getMainLooper());
    final boolean[] done = { false };
    final SensorEventListener listener = new SensorEventListener() {
      @Override public void onSensorChanged(SensorEvent e) {
        if (done[0]) return;
        done[0] = true;
        sm.unregisterListener(this);
        JSObject out = new JSObject();
        out.put("available", true);
        out.put("steps", (long) e.values[0]);
        call.resolve(out);
      }
      @Override public void onAccuracyChanged(Sensor s, int a) {}
    };
    sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_UI);
    // 센서가 한 번도 안 울리면(기기가 멈춰 있어 값이 안 바뀜) 3초 뒤 접는다
    handler.postDelayed(() -> {
      if (done[0]) return;
      done[0] = true;
      sm.unregisterListener(listener);
      JSObject out = new JSObject();
      out.put("available", true);
      out.put("quiet", true);
      call.resolve(out);
    }, 3000);
  }
}
