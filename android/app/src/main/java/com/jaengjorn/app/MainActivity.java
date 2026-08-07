package com.jaengjorn.app;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

// Capacitor เองไม่ได้ผูก WebView เข้ากับระบบขอสิทธิ์ของ Android ให้อัตโนมัติ
// หน้าเว็บในแอปที่เรียก navigator.mediaDevices.getUserMedia() (เช่นหน้าถ่ายรูปแจ้งสัตว์)
// หรือ navigator.geolocation (เช่นหน้าปักหมุดจุดพบสัตว์บนแผนที่ Leaflet)
// หรือ <input type="file"> (เช่นปุ่ม "เลือกจากคลัง" เปิดแกลลอรี — ทดสอบแล้วแค่แก้ accept
// ฝั่งเว็บอย่างเดียวไม่พอ ต้องมี onShowFileChooser ผูกไว้ฝั่ง native ด้วยจริงๆ)
// จะโดนปฏิเสธ/ไม่มีอะไรเกิดขึ้นเลยเงียบๆ ถ้าไม่ override onPermissionRequest /
// onGeolocationPermissionsShowPrompt / onShowFileChooser ตรงนี้ให้ส่งต่อไปขอสิทธิ์จริงจาก Android
public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1002;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1003;
    private PermissionRequest pendingCameraRequest;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;
    private ValueCallback<Uri[]> pendingFileChooserCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // WebView ปิด geolocation ไว้เป็นค่าเริ่มต้น ต้องเปิดเองก่อน ไม่งั้น onGeolocationPermissionsShowPrompt
        // จะไม่ถูกเรียกเลยแม้จะ override ไว้แล้วก็ตาม
        this.bridge.getWebView().getSettings().setGeolocationEnabled(true);

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

            @Override
            public void onGeolocationPermissionsShowPrompt(final String origin, final GeolocationPermissions.Callback callback) {
                runOnUiThread(() -> {
                    boolean มีสิทธิ์แล้ว =
                        ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                            == PackageManager.PERMISSION_GRANTED
                        || ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_COARSE_LOCATION)
                            == PackageManager.PERMISSION_GRANTED;

                    if (มีสิทธิ์แล้ว) {
                        callback.invoke(origin, true, false);
                    } else {
                        // ยังไม่เคยขอสิทธิ์ตำแหน่งจาก Android มาก่อน — เก็บ callback ไว้ก่อน
                        // แล้วเด้ง dialog ขอสิทธิ์ ผลลัพธ์จะกลับมาที่ onRequestPermissionsResult ด้านล่าง
                        pendingGeoCallback = callback;
                        pendingGeoOrigin = origin;
                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
                            LOCATION_PERMISSION_REQUEST_CODE
                        );
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                // ถ้ามี request ค้างอยู่จากรอบก่อน (ผู้ใช้กดเลือกไฟล์ซ้อนกัน) ยกเลิกอันเก่าทิ้งก่อน
                if (pendingFileChooserCallback != null) {
                    pendingFileChooserCallback.onReceiveValue(null);
                    pendingFileChooserCallback = null;
                }
                pendingFileChooserCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(intent, "เลือกรูปภาพ"), FILE_CHOOSER_REQUEST_CODE);
                } catch (ActivityNotFoundException e) {
                    pendingFileChooserCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (pendingFileChooserCallback == null) {
                super.onActivityResult(requestCode, resultCode, data);
                return;
            }
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
            pendingFileChooserCallback.onReceiveValue(results);
            pendingFileChooserCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
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

        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE && pendingGeoCallback != null) {
            boolean granted = false;
            for (int result : grantResults) {
                if (result == PackageManager.PERMISSION_GRANTED) {
                    granted = true;
                    break;
                }
            }
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }
}
