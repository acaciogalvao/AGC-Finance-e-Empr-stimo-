const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to inject Android Accessibility Service & Overlay configuration
 * for AGC Finance Copilot (Uber & 99 Ride Reader)
 */
function withAccessibilityService(config) {
  // 1. Modifica o AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Adiciona permissões essenciais
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissionsToAdd = [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.WAKE_LOCK',
      'android.permission.VIBRATE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.PACKAGE_USAGE_STATS',
    ];

    permissionsToAdd.forEach((permName) => {
      if (!androidManifest['uses-permission'].some((p) => p.$['android:name'] === permName)) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permName },
        });
      }
    });

    // Adiciona a declaração do AccessibilityService no Application
    const application = androidManifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }

      const serviceName = 'com.acaciogalvao.agcfinance.CopilotAccessibilityService';
      if (!application.service.some((s) => s.$['android:name'] === serviceName)) {
        application.service.push({
          $: {
            'android:name': serviceName,
            'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
            'android:exported': 'true',
            'android:label': 'AGC Finance Copiloto (Leitor Uber & 99)',
            'android:description': '@string/accessibility_service_description',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name': 'android.accessibilityservice.AccessibilityService',
                  },
                },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.accessibilityservice',
                'android:resource': '@xml/accessibility_service_config',
              },
            },
          ],
        });
      }
    }

    return config;
  });

  // 2. Adiciona o arquivo xml de configuração de acessibilidade e strings
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res');
      const xmlDir = path.join(resPath, 'xml');
      const valuesDir = path.join(resPath, 'values');

      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      if (!fs.existsSync(valuesDir)) {
        fs.mkdirSync(valuesDir, { recursive: true });
      }

      // accessibility_service_config.xml
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_description"
    android:packageNames="com.ubercab.driver,com.taxis99,com.indrive.driver"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged|typeNotificationStateChanged"
    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows|flagReportViewIds|flagIncludeNotImportantViews"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:canRetrieveWindowContent="true"
    android:settingsActivity="com.acaciogalvao.agcfinance.MainActivity" />
`;
      fs.writeFileSync(path.join(xmlDir, 'accessibility_service_config.xml'), xmlContent, 'utf8');

      // strings.xml (adiciona descrição do serviço)
      const stringsPath = path.join(valuesDir, 'strings.xml');
      let stringsContent = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>`;
      if (fs.existsSync(stringsPath)) {
        stringsContent = fs.readFileSync(stringsPath, 'utf8');
      }

      const descString = '<string name="accessibility_service_description">Permite que o AGC Finance leia automaticamente ofertas de corridas nos apps Uber Driver e 99 Motorista para calcular R$/KM e lucro líquido em tempo real.</string>';
      if (!stringsContent.includes('accessibility_service_description')) {
        stringsContent = stringsContent.replace('</resources>', `  ${descString}\n</resources>`);
        fs.writeFileSync(stringsPath, stringsContent, 'utf8');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAccessibilityService;
