// CampaignPages.jsx — Versi Final (Fix: hasil download menyertakan frame)
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import * as fabric from 'fabric';
import Compressor from 'compressorjs';
import html2canvas from 'html2canvas';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function TwibbonEditor({ campaign }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  const canvasContainerRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const userImageRef = useRef(null);
  const frameImageRef = useRef(null);

  useEffect(() => {
    if (!campaign?.frame_width || !campaign?.frame_height || !canvasElRef.current || !canvasContainerRef.current) {
      return;
    }

    const canvasEl = canvasElRef.current;
    const container = canvasContainerRef.current;
    const canvas = new fabric.Canvas(canvasEl, { preserveObjectStacking: true });
    fabricCanvasRef.current = canvas;

    const setCanvasDimensions = () => {
      const containerWidth = container.offsetWidth;
      const aspectRatio = campaign.frame_height / campaign.frame_width;
      const containerHeight = containerWidth * aspectRatio;

      canvas.setDimensions({ width: containerWidth, height: containerHeight });
      canvas.renderAll();
    };

    const resizeObserver = new ResizeObserver(() => {
      setCanvasDimensions();
      if (frameImageRef.current) {
        frameImageRef.current.scaleToWidth(canvas.getWidth());
        frameImageRef.current.set({
          left: canvas.getWidth() / 2,
          top: canvas.getHeight() / 2,
        });
        canvas.bringToFront(frameImageRef.current);
        canvas.renderAll();
      }
    });

    resizeObserver.observe(container);
    setCanvasDimensions();

    fabric.Image.fromURL(campaign.frame_url, (frameImg) => {
        console.log("✅ Frame berhasil dimuat ke canvas!", frameImg);
      const width = canvas.getWidth();
      const height = canvas.getHeight();
      frameImg.set({
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
        left: width / 2,
        top: height / 2,
      });
      frameImg.scaleToWidth(width);
      canvas.add(frameImg);
      canvas.bringToFront(frameImg);
      frameImageRef.current = frameImg;
      setFrameLoaded(true);
      canvas.renderAll();
    }, { crossOrigin: 'anonymous' });

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [campaign]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvasRef.current) return;
    setIsPhotoProcessing(true);

    new Compressor(file, {
      quality: NaN,
      maxWidth: 1350,
      maxHeight: 1350,
      success(result) {
        const blobUrl = URL.createObjectURL(result);
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = fabricCanvasRef.current;
            const width = canvas.getWidth();
            const height = canvas.getHeight();

            const fabricImg = new fabric.Image(img);
            if (userImageRef.current) canvas.remove(userImageRef.current);

            fabricImg.scaleToWidth(width);
            if (fabricImg.getScaledHeight() < height) {
              fabricImg.scaleToHeight(height);
            }

            fabricImg.set({
              originX: 'center',
              originY: 'center',
              left: width / 2,
              top: height / 2,
              cornerColor: '#4f46e5',
              cornerStyle: 'circle',
            });

            canvas.add(fabricImg);
            canvas.sendObjectToBack(fabricImg);
            userImageRef.current = fabricImg;
            setIsImageLoaded(true);
            if (frameImageRef.current) canvas.bringToFront(frameImageRef.current);
            canvas.renderAll();

          } catch (err) {
            console.error("Gagal saat menambahkan gambar:", err);
            alert("Terjadi kesalahan saat menambahkan gambar.");
          } finally {
            URL.revokeObjectURL(blobUrl);
            setIsPhotoProcessing(false);
          }
        };

        img.onerror = () => {
          alert("Gagal memuat gambar.");
          URL.revokeObjectURL(blobUrl);
          setIsPhotoProcessing(false);
        };

        img.src = blobUrl;
      },
      error(err) {
        alert(`Gagal memproses gambar: ${err.message}`);
        setIsPhotoProcessing(false);
      },
    });
  };

  const handleControlChange = (type, value) => {
    if (!userImageRef.current || !fabricCanvasRef.current) return;
    const imageObject = userImageRef.current;
    if (type === 'scale') imageObject.scale(value);
    if (type === 'rotate') imageObject.set('angle', value);
    fabricCanvasRef.current.renderAll();
  };

//   const handleDownload = () => {
//     const canvas = fabricCanvasRef.current;
//     if (!canvas || !isImageLoaded) return alert('Silakan unggah foto terlebih dahulu.');
//     canvas.discardActiveObject();
//     canvas.renderAll();

//     const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
//     const link = document.createElement('a');
//     link.download = `${campaign.slug}-twibbon.png`;
//     link.href = dataURL;
//     link.click();
//   };

    const handleDownload = () => {
    const targetElement = document.getElementById('twibbon-area');
    if (!targetElement || !isImageLoaded) {
        alert("Silakan unggah foto terlebih dahulu.");
        return;
    }

    html2canvas(targetElement, {
        useCORS: true,
        backgroundColor: null,
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${campaign.slug}-twibbon.png`;
        link.href = canvas.toDataURL('image/png', 0.85);
        link.click();
    });
    };

  return (
    <div className="mt-8 w-full max-w-lg">
      <div
      id='twibbon-area'
        className="relative w-full border rounded-lg overflow-hidden bg-gray-200"
        ref={canvasContainerRef}
        style={{ aspectRatio: `${campaign.frame_width} / ${campaign.frame_height}` }}>
        <canvas ref={canvasElRef} className="absolute top-0 left-0 z-0" />
        {!frameLoaded && (
          <img
            src={campaign.frame_url}
            alt="Bingkai Kampanye"
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
          />
        )}
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

        {isImageLoaded && (
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label>Perbesar / Perkecil</Label>
                <Slider defaultValue={[1]} min={0.5} max={1.5} step={0.01} onValueChange={([v]) => handleControlChange('scale', v)} />
              </div>
              <div>
                <Label>Putar</Label>
                <Slider defaultValue={[0]} min={-180} max={180} step={1} onValueChange={([v]) => handleControlChange('rotate', v)} />
              </div>
            </div>
          </Card>
        )}

        <Button onClick={handleDownload} size="lg" disabled={!isImageLoaded || isPhotoProcessing}>
          Unduh Hasil Gambar
        </Button>
      </div>
    </div>
  );
}

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
