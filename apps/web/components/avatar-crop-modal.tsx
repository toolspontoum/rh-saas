"use client";

import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

type AvatarCropModalProps = {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

export function AvatarCropModal({ open, imageSrc, onCancel, onConfirm }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const safeImage = useMemo(() => imageSrc ?? "", [imageSrc]);

  const onCropComplete = useCallback((_area: Area, area: Area) => {
    setAreaPixels(area);
  }, []);

  if (!open || !imageSrc) return null;

  async function handleConfirm() {
    if (!areaPixels) return;
    setSaving(true);
    try {
      const file = await cropImageToFile(safeImage, areaPixels);
      await onConfirm(file);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Ajustar imagem de perfil">
        <h3>Ajustar imagem de perfil</h3>
        <p className="muted">Recorte em formato quadrado (4x4). A imagem será salva em até 200x200px.</p>

        <div className="avatar-crop-area">
          <Cropper
            image={safeImage}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label>
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button onClick={handleConfirm} disabled={saving}>{saving ? "Salvando..." : "Salvar imagem"}</button>
        </div>
      </div>
    </div>
  );
}

async function cropImageToFile(imageSrc: string, area: Area): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const cropSize = Math.max(1, Math.min(area.width, area.height));
  const size = Math.max(1, Math.min(200, Math.round(cropSize)));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem.");
  }

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });

  if (!blob) {
    throw new Error("Falha ao gerar imagem recortada.");
  }

  return new File([blob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
