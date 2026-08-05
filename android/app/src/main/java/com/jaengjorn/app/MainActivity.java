package com.jaengjorn.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

// Capacitor เองไม่ได้ผูก WebView เข้ากับระบบขอสิทธิ์ของ Android ให้อัตโนมัติ
// หน้าเว็บในแอปที่เรียก navigator.mediaDevices.getUserMedia() (เช่นหน้าถ่ายรูปแจ้งสัตว์)
// จะโดนปฏิเสธเงียบๆ ถ้าไม่ override onPermissionRequest ตรงนี้ให้ส่งต่อไปขอสิทธิ์กล้องจริงจาก Android
public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingCameraRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                            == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.getResources());
                    } else {
                        // ยังไม่เคยขอสิทธิ์กล้องจาก Android มาก่อน — เก็บ request ไว้ก่อน
                        // แล้วเด้ง dialog ขอสิทธิ์ ผลลัพธ์จะกลับมาที่ onRequestPermissionsResult ด้านล่าง
                        pendingCameraRequest = request;
                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.CAMERA},
                            CAMERA_PERMISSION_REQUEST_CODE
                        );
                    }
                });
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE && pendingCameraRequest != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingCameraRequest.grant(pendingCameraRequest.getResources());
            } else {
                pendingCameraRequest.deny();
            }
            pendingCameraRequest = null;
        }
    }
}
