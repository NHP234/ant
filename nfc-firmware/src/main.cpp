#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include "secrets.h"

// --- Cấu hình chân SPI cho RC522 ---
// SDA/SS Pin
#define SCK_PIN 18
#define MISO_PIN 19
#define MOSI_PIN 23
#define SS_PIN 5
// RST Pin
#define RST_PIN 22

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  
  // 1. Kết nối Wi-Fi
  Serial.println("\nĐang kết nối Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nĐã kết nối Wi-Fi! IP: " + WiFi.localIP().toString());

  // 2. Khởi tạo SPI và RC522
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  Serial.println("RC522 sẵn sàng. Vui lòng quẹt thẻ...");
}

void loop() {
  // Tìm thẻ mới
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  // Đọc dữ liệu thẻ
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Lấy UID và chuyển thành chuỗi Hex (VD: 04:A2:B3:C4)
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(rfid.uid.uidByte[i], HEX);
    if (i != rfid.uid.size - 1) {
      uid += ":";
    }
  }
  uid.toUpperCase();
  Serial.println("Quẹt thẻ thành công! UID: " + uid);

  // Gửi API
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", API_KEY);

    String jsonPayload = "{\"uid\":\"" + uid + "\"}";
    Serial.println("Đang gửi data: " + jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.println("Response Code: " + String(httpResponseCode));
      String response = http.getString();
      Serial.println("Response Body: " + response);
    } else {
      Serial.print("Lỗi khi gọi API: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }

  // Tạm dừng RFID để tránh đọc liên tục một thẻ (debounce)
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  // Delay 2 giây trước khi cho phép quét lần tiếp theo
  delay(2000);
}
