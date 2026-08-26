import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { tokens } from '@probash/design-tokens';
import type { PublicJobVerificationDto } from '@probash/contracts';
import { apiRequest } from '../lib/api';
import { ActionButton, Card, Notice, Screen, t, Value } from '../components/MobileUi';

/**
 * §21/§23 — verification by id. The QR camera path lands in the next mobile epic;
 * until then this screen does the same lookup by typed id rather than pretending to
 * scan.
 */
export default function Verify() {
  const [publicId, setPublicId] = useState('');
  const [result, setResult] = useState<PublicJobVerificationDto | undefined>();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);

  async function check() {
    const response = await apiRequest<PublicJobVerificationDto>(
      `/api/v1/verify/job/${encodeURIComponent(publicId.trim())}`,
    );
    setResult(response);
  }

  async function scanQr(token: string) {
    if (scanLocked) return;
    setScanLocked(true);
    try {
      const response = await apiRequest<{ qrValid: boolean; publicId?: string }>(
        '/api/v1/verify/qr',
        { method: 'POST', body: { token } },
      );
      if (response.qrValid && response.publicId) {
        setPublicId(response.publicId);
        const verified = await apiRequest<PublicJobVerificationDto>(
          `/api/v1/verify/job/${encodeURIComponent(response.publicId)}`,
        );
        setResult(verified);
        setCameraOpen(false);
      }
    } finally {
      setScanLocked(false);
    }
  }

  return (
    <Screen title={t('scanner.title')}>
      <Card>
        <TextInput
          accessibilityLabel={t('scanner.publicIdLabel')}
          placeholder="BD-QA-2026-00000000"
          value={publicId}
          onChangeText={setPublicId}
          autoCapitalize="characters"
          style={{
            minHeight: tokens.size.tapTargetMin,
            borderWidth: 1,
            borderColor: tokens.semanticLight.border,
            borderRadius: tokens.radius.md,
            paddingHorizontal: tokens.space.md,
            fontSize: tokens.typography.scale.body,
          }}
        />
        <ActionButton label={t('scanner.checkNow')} onPress={() => void check()} />
        <ActionButton
          label={t('mobile.scanQr')}
          secondary
          onPress={() =>
            void (async () => {
              if (!permission?.granted) await requestPermission();
              setCameraOpen(true);
            })()
          }
        />
      </Card>
      {cameraOpen && permission?.granted ? (
        <View style={{ height: 320, overflow: 'hidden', borderRadius: tokens.radius.lg }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={(event) => void scanQr(event.data)}
          />
        </View>
      ) : null}
      {cameraOpen && permission && !permission.granted ? (
        <Notice tone="warning">{t('mobile.cameraPermission')}</Notice>
      ) : null}
      {result ? (
        <Card>
          <Value>
            {result.status === 'verified' ? t('job.verifiedJob') : t('risk.kind.job_id_not_found')}
          </Value>
          <Value>{result.publicId}</Value>
          {result.isSyntheticDemoData ? (
            <Notice tone="warning">{t('common.demoDataWarning')}</Notice>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
