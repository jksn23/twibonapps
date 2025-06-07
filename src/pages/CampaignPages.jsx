import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
// PERBAIKAN: Impor spesifik untuk tree-shaking dan stabilitas
import { Canvas, Image as FabricImage } from 'fabric';
import html2canvas from 'html2canvas';
import Compressor from 'compressorjs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Komponen Editor Kanvas
function TwibbonEditor({ campaign }) {
  const [userImage, setUserImage] = useState(null);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);

  const canvasContainerRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  useEffect(() => {
    if (!campaign?.frame_width || !campaign?.frame_height) return;

    const container = canvasContainerRef.current;
    if (!container) return;

    // Bersihkan container agar tidak double render
    container.innerHTML = '';

    const canvasEl = document.createElement('canvas');
    container.appendChild(canvasEl);

    const containerWidth = container.clientWidth;
    const aspectRatio = campaign.frame_height / campaign.frame_width;
    const containerHeight = containerWidth * aspectRatio;

    canvasEl.width = containerWidth;
    canvasEl.height = containerHeight;

    const canvas = new Canvas(canvasEl, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#e5e7eb',
    });

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [campaign]);

    const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvasRef.current) return;

    setIsPhotoProcessing(true);

    new Compressor(file, {
        quality: 0.8,
        maxWidth: 1080,
        maxHeight: 1080,
        success(result) {
        const url = URL.createObjectURL(result);

        FabricImage.fromURL(
            url,
            (fabricImg) => {
            try {
                const canvas = fabricCanvasRef.current;
                if (!canvas) throw new Error('Canvas tidak tersedia');

                if (userImage) canvas.remove(userImage);

                const scale = Math.max(canvas.width / fabricImg.width, canvas.height / fabricImg.height);
                fabricImg.scale(scale);
                fabricImg.set({
                originX: 'center',
                originY: 'center',
                left: canvas.width / 2,
                top: canvas.height / 2,
                cornerColor: '#4f46e5',
                cornerStyle: 'circle',
                });

                console.log("✅ Gambar berhasil dimuat ke fabric:", fabricImg);

                canvas.add(fabricImg);
                fabricImg.sendToBack();
                canvas.setActiveObject(fabricImg);
                setUserImage(fabricImg);
                canvas.renderAll();
            } catch (err) {
                console.error('Gagal memproses gambar ke canvas:', err);
                alert('Terjadi kesalahan saat menambahkan gambar.');
            } finally {
                setIsPhotoProcessing(false);
                URL.revokeObjectURL(url);
            }
            },
            {
            crossOrigin: 'anonymous',
            }
        );
        },
        error(err) {
        alert(`Gagal memproses gambar: ${err.message}`);
        setIsPhotoProcessing(false);
        },
    });
    };




  const handleControlChange = (type, value) => {
    if (!userImage || !fabricCanvasRef.current) return;
    if (type === 'scale') userImage.scale(value);
    if (type === 'rotate') userImage.set('angle', value);
    fabricCanvasRef.current.renderAll();
  };

    const handleDownload = () => {
    const container = canvasContainerRef.current?.parentNode;
    if (!container || !userImage) {
        alert('Silakan unggah foto Anda terlebih dahulu.');
        return;
    }

    fabricCanvasRef.current.discardActiveObject().renderAll();

    html2canvas(container, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: null,
        scale: 2, // kualitas tinggi
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${campaign.slug}-twibbon.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
    };


  return (
    <div className="mt-8 w-full max-w-lg">
      <div
        className="relative w-full border rounded-lg overflow-hidden bg-muted"
        style={{ aspectRatio: `${campaign.frame_width} / ${campaign.frame_height}` }}
        >
        {/* Container Canvas dibuat di dalam absolute */}
        <div
            ref={canvasContainerRef}
            className="absolute top-0 left-0 w-full h-full z-0"
        />

        {/* Bingkai tetap dikelola React */}
        <img
            src={campaign.frame_url}
            alt="Bingkai Kampanye"
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        />

        {/* Loader jika sedang memproses */}
        {isPhotoProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
        )}
        </div>


      <div className="mt-6 flex flex-col space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
          <Label htmlFor="picture">Unggah Fotomu</Label>
          <Input id="picture" type="file" onChange={handlePhotoUpload} accept="image/*" disabled={isPhotoProcessing} />
        </div>

        {userImage && (
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label>Perbesar / Perkecil</Label>
                <Slider defaultValue={[1]} min={0.1} max={3} step={0.01} onValueChange={(value) => handleControlChange('scale', value[0])} />
              </div>
              <div>
                <Label>Putar</Label>
                <Slider defaultValue={[0]} min={-180} max={180} step={1} onValueChange={(value) => handleControlChange('rotate', value[0])} />
              </div>
            </div>
          </Card>
        )}

        <Button onClick={handleDownload} size="lg" disabled={!userImage || isPhotoProcessing}>
          Unduh Hasil Gambar
        </Button>
      </div>
    </div>
  );
}


// Komponen Halaman Utama
export default function CampaignPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('campaigns').select('*').eq('slug', slug).single();
        if (error || !data) throw new Error('Kampanye tidak ditemukan atau tidak aktif.');
        setCampaign(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [slug]);

  if (loading) return <div className="text-center p-10 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-center p-10 text-destructive">{error}</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-center">{campaign?.campaign_name}</h1>
      <p className="text-muted-foreground text-center mt-2 max-w-2xl">{campaign?.description}</p>

      {campaign && <TwibbonEditor campaign={campaign} />}
    </div>
  );
}