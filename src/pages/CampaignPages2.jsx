import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import * as fabric from 'fabric'; // Pastikan impor seperti ini
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);

  const [frameLoaded, setFrameLoaded] = useState(false);


  // Refs untuk elemen DOM dan objek Fabric
  const canvasContainerRef = useRef(null); // Ref untuk div pembungkus
  const canvasElRef = useRef(null); // Ref untuk elemen <canvas> itu sendiri
  const fabricCanvasRef = useRef(null);
  const userImageRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const frameImageRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const captureRef = useRef(null);

  // useEffect untuk inisialisasi dan resize kanvas
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

    canvas.setDimensions({
      width: containerWidth,
      height: containerHeight,
    });
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

  // Tambahkan frame PNG ke dalam canvas
  fabric.Image.fromURL(campaign.frame_url, (frameImg) => {
    frameImg.set({
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
    });
    frameImg.scaleToWidth(canvas.getWidth());
    canvas.add(frameImg);
    canvas.bringToFront(frameImg);
    frameImageRef.current = frameImg;
    canvas.renderAll();
  }, { crossOrigin: 'anonymous' });

  return () => {
    resizeObserver.disconnect();
    canvas.dispose();
    fabricCanvasRef.current = null;
  };
}, [campaign]); // Hanya bergantung pada data campaign
  
      const handlePhotoUpload = (e) => {
          const file = e.target.files[0];
          if (!file || !fabricCanvasRef.current) return;

          setIsPhotoProcessing(true);

      new Compressor(file, {
        quality: 0.8,
        maxWidth: 1080,
        maxHeight: 1080,
        success(result) {
          const blobUrl = URL.createObjectURL(result);
          const img = new Image();

          img.onload = () => {
            try {
              const canvas = fabricCanvasRef.current;

              // Buat objek fabric.Image dari elemen <img>
              const fabricImg = new fabric.Image(img);

              if (userImageRef.current) {
                canvas.remove(userImageRef.current);
              }

              // Skala otomatis berdasarkan ukuran canvas
              fabricImg.scaleToWidth(canvas.getWidth());
              if (fabricImg.getScaledHeight() < canvas.getHeight()) {
                fabricImg.scaleToHeight(canvas.getHeight());
              }

              fabricImg.set({
                originX: 'center',
                originY: 'center',
                left: canvas.getWidth() / 2,
                top: canvas.getHeight() / 2,
                cornerColor: '#4f46e5',
                cornerStyle: 'circle',
              });

              canvas.add(fabricImg);
              canvas.sendObjectToBack(fabricImg);
              // fabricImg.sendToBack();
              // fabricCanvasRef.current.sendToBack(fabricImg); 
              canvas.setActiveObject(fabricImg);

              userImageRef.current = fabricImg;
              setIsImageLoaded(true);

              if (frameImageRef.current) {
                canvas.bringToFront(frameImageRef.current);
}

              canvas.renderAll();

              
            } catch (err) {
              console.error('❌ Error saat menambahkan gambar ke canvas:', err);
              alert('Terjadi kesalahan saat menambahkan gambar.');
            } finally {
              URL.revokeObjectURL(blobUrl);
              setIsPhotoProcessing(false);
            }
          };

          img.onerror = () => {
            alert('Gagal memuat gambar.');
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

    if (type === 'scale') {
        const currentScale = imageObject.scaleX;
        imageObject.scale(currentScale * value); // Jadikan perubahan skala lebih intuitif
    }
    if (type === 'rotate') {
        imageObject.set('angle', value);
    }

    fabricCanvasRef.current.renderAll();
  };

  const handleDownload = () => {
    const container = canvasContainerRef.current?.parentNode;
    
    if (!container || !isImageLoaded) {
        alert('Silakan unggah foto Anda terlebih dahulu.');
        return;
    }
   

    // fabricCanvasRef.current.discardActiveObject().renderAll();
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();

    const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2, // meningkatkan resolusi
      });

      const link = document.createElement('a');
      link.download = `${campaign.slug}-twibbon.png`;
      link.href = dataURL;
      link.click();

  };

  return (
    <div className="mt-8 w-full max-w-lg">
      <div
        className="relative w-full border rounded-lg overflow-hidden bg-gray-200"
        ref={canvasContainerRef} // Ref untuk kontainer utama
        style={{ aspectRatio: `${campaign.frame_width} / ${campaign.frame_height}` }}
        >
        
        {/* PERUBAHAN: Elemen <canvas> sekarang dirender langsung oleh React */}
        <canvas ref={canvasElRef} className="absolute top-0 left-0 z-0" />

        {/* <img
            src={campaign.frame_url}
            ref={captureRef}
            alt="Bingkai Kampanye"
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        /> */}

        {isPhotoProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
        )}
      </div>

      <div className="mt-6 flex flex-col space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
          <Label htmlFor="picture">Unggah Fotomu</Label>
          <Input id="picture" type="file" onChange={handlePhotoUpload} accept="image/png, image/jpg, image/jpeg" disabled={isPhotoProcessing} />
        </div>

        {isImageLoaded && (
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <Label>Perbesar / Perkecil</Label>
                {/* Mengubah slider menjadi lebih intuitif */}
                <Slider defaultValue={[1]} min={0.5} max={1.5} step={0.01} onValueChange={(value) => handleControlChange('scale', value[0])} />
              </div>
              <div>
                <Label>Putar</Label>
                <Slider defaultValue={[0]} min={-180} max={180} step={1} onValueChange={(value) => handleControlChange('rotate', value[0])} />
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
