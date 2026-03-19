import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, RefreshCw, Trash2 } from "lucide-react";

interface MfaFactor {
  id: string;
  factor_type: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [aal, setAal] = useState<{ currentLevel: string | null; nextLevel: string | null }>({
    currentLevel: null,
    nextLevel: null,
  });
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [friendlyName, setFriendlyName] = useState("Mon telephone");
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const verifiedFactors = useMemo(
    () => factors.filter((factor) => factor.status === "verified"),
    [factors]
  );

  const loadMfaState = async () => {
    setLoading(true);

    const [factorsRes, aalRes] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factorsRes.error) {
      toast.error(factorsRes.error.message);
    } else {
      setFactors(factorsRes.data.all as MfaFactor[]);
    }

    if (aalRes.error) {
      toast.error(aalRes.error.message);
    } else {
      setAal({
        currentLevel: aalRes.data.currentLevel,
        nextLevel: aalRes.data.nextLevel,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadMfaState();
  }, []);

  const handleEnroll = async () => {
    setSaving(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: friendlyName.trim() || "Mon telephone",
      issuer: "CyberGuard",
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPendingFactorId(data.id);
    setQrCodeSvg(data.totp.qr_code);
    setSecret(data.totp.secret);
    setVerifyCode("");
    toast.success("2FA initialisee. Scannez le QR code puis saisissez le code genere.");
    await loadMfaState();
  };

  const handleVerify = async () => {
    if (!pendingFactorId) {
      toast.error("Aucun facteur 2FA en attente.");
      return;
    }

    const code = verifyCode.trim();
    if (code.length !== 6) {
      toast.error("Saisissez le code a 6 chiffres de votre application d'authentification.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pendingFactorId,
      code,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Double authentification activee avec succes.");
    setPendingFactorId(null);
    setQrCodeSvg(null);
    setSecret(null);
    setVerifyCode("");
    await loadMfaState();
  };

  const handleUnenroll = async (factorId: string) => {
    setRemovingId(factorId);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setRemovingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Facteur 2FA supprime.");
    await loadMfaState();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Securite du compte</h1>
          <p className="text-sm text-muted-foreground">
            Activez la double authentification avec une application TOTP comme Google Authenticator, Authy ou 1Password.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadMfaState()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Niveau de securite</CardTitle>
            <CardDescription>Etat actuel de la session et facteurs verifies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Session actuelle</p>
                <p className="text-sm text-muted-foreground">
                  {aal.currentLevel === "aal2"
                    ? "Connexion renforcee par la 2FA"
                    : "Connexion simple sans verification secondaire"}
                </p>
              </div>
              <Badge variant={aal.currentLevel === "aal2" ? "default" : "secondary"}>
                {aal.currentLevel ?? "aal1"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Facteurs actifs</p>
                <p className="text-sm text-muted-foreground">Nombre de facteurs TOTP verifies sur ce compte.</p>
              </div>
              <Badge variant={verifiedFactors.length > 0 ? "default" : "secondary"}>{verifiedFactors.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activer la 2FA</CardTitle>
            <CardDescription>Generez un QR code puis validez le code a 6 chiffres de votre application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="friendlyName">Nom de l'appareil</Label>
              <Input
                id="friendlyName"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="Mon telephone"
              />
            </div>
            <Button onClick={() => void handleEnroll()} disabled={saving}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Generer le QR code
            </Button>

            {qrCodeSvg && secret && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-muted p-2">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Scannez ce QR code</p>
                    <p className="text-sm text-muted-foreground">Ensuite, saisissez le code genere par votre application.</p>
                  </div>
                </div>
                <div
                  className="mx-auto flex w-full max-w-[220px] justify-center rounded-lg bg-white p-4"
                  dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                />
                <div className="space-y-2">
                  <Label htmlFor="totpSecret">Code secret de secours</Label>
                  <Input id="totpSecret" value={secret} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verifyCode">Code a 6 chiffres</Label>
                  <Input
                    id="verifyCode"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </div>
                <Button onClick={() => void handleVerify()} disabled={saving || verifyCode.trim().length !== 6}>
                  Verifier et activer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facteurs enregistres</CardTitle>
          <CardDescription>Supprimez ou surveillez les facteurs 2FA associes a ce compte.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement de la configuration MFA...</p>
          ) : factors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun facteur 2FA n'est configure pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {factors.map((factor) => (
                <div key={factor.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium">{factor.friendly_name || "Application d'authentification"}</p>
                    <p className="text-sm text-muted-foreground">
                      Type: {factor.factor_type} | Statut: {factor.status} | Cree le {new Date(factor.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void handleUnenroll(factor.id)}
                    disabled={removingId === factor.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
