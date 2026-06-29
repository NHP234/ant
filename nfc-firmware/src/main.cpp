#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <cstring>
#include "secrets.h"

// RC522 SPI pins
#define SCK_PIN 18
#define MISO_PIN 19
#define MOSI_PIN 23
#define SS_PIN 5
#define RST_PIN 22

MFRC522 rfid(SS_PIN, RST_PIN);

bool isHttpsUrl(const char* url) {
  return strncmp(url, "https://", 8) == 0;
}

bool initializeRfid() {
  rfid.PCD_Init();
  delay(50);

  byte version = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.printf("RC522 VersionReg: 0x%02X\n", version);

  if (version == 0x00 || version == 0xFF) {
    Serial.println("Cannot communicate with RC522. Check 3.3V, GND, SDA/SCK/MOSI/MISO/RST wiring.");
    return false;
  }

  Serial.println("RC522 ready. Please scan a card/tag...");
  return true;
}

void setup() {
  Serial.begin(115200);

  Serial.println("\nConnecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected. IP: " + WiFi.localIP().toString());

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  initializeRfid();
}

void loop() {
  // Tự động kết nối lại nếu mất kết nối Wi-Fi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.print("Wi-Fi connection lost. Reconnecting");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\nWi-Fi reconnected. IP: " + WiFi.localIP().toString());
  }

  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(rfid.uid.uidByte[i], HEX);
    if (i != rfid.uid.size - 1) {
      uid += ":";
    }
  }
  uid.toUpperCase();
  Serial.println("Card scanned. UID: " + uid);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;

    if (isHttpsUrl(API_URL)) {
      // Demo mode for HTTPS deployments. For production-grade firmware,
      // replace this with secureClient.setCACert(...).
      secureClient.setInsecure();
      http.begin(secureClient, API_URL);
    } else {
      http.begin(plainClient, API_URL);
    }

    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-KEY", API_KEY);

    String jsonPayload = "{\"uid\":\"" + uid + "\"}";
    Serial.println("Sending payload: " + jsonPayload);

    int httpResponseCode = http.POST(jsonPayload);
    if (httpResponseCode > 0) {
      Serial.println("Response Code: " + String(httpResponseCode));
      Serial.println("Response Body: " + http.getString());
    } else {
      Serial.print("API request failed: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(2000);
}
