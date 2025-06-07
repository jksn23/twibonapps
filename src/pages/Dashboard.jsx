import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider'; // Gunakan hook auth kita
import { Share2, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

// Impor komponen dari shadcn/ui
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';


export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Dapatkan data user dari context

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [campaignName, setCampaignName] = useState('');
  const [description, setDescription] = useState('');
  const [frameFile, setFrameFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [slug, setSlug] = useState('');

  // Fungsi untuk mengambil data kampanye
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('owner_id', user.id); // Ambil hanya kampanye milik user ini

        if (error) throw error;
        setCampaigns(data);
      } catch (error) {
        console.error('Error fetching campaigns:', error.message);
        alert('Gagal memuat kampanye.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [user]); // Jalankan ulang jika user berubah

  const handleCreateCampaign = async (e) => {
  e.preventDefault();
  if (!frameFile || !campaignName || !slug) {
    alert('Nama, tautan kustom, dan file bingkai tidak boleh kosong.');
    return;
  }

  // Tambahkan logika untuk membaca dimensi gambar
  const image = new Image();
  const objectUrl = URL.createObjectURL(frameFile);
  image.src = objectUrl;

  image.onload = async () => {
    setIsUploading(true);
    try {
      // 1. Unggah gambar bingkai
      const fileExt = frameFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `frames/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('frames')
        .upload(filePath, frameFile);

      if (uploadError) throw uploadError;

      // 2. Dapatkan URL publik
      const { data: { publicUrl } } = supabase.storage
        .from('frames')
        .getPublicUrl(filePath);

      // 3. Simpan data ke database, TERMASUK DIMENSI
      const { error: insertError } = await supabase.from('campaigns').insert({
          owner_id: user.id,
          campaign_name: campaignName,
          description: description,
          slug: slug,
          frame_url: publicUrl,
          frame_width: image.naturalWidth,   // <-- TAMBAHKAN INI
          frame_height: image.naturalHeight, // <-- TAMBAHKAN INI
          start_date: new Date().toISOString(),
          end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      });

      if (insertError) throw insertError;

      alert('Kampanye berhasil dibuat!');
      window.location.reload(); 

    } catch (error) {
      console.error('Error creating campaign:', error);
      alert(`Gagal membuat kampanye: ${error.message}`);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl); // Membersihkan object URL
    }
  };
};


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang, {user?.email}</p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          Keluar
        </Button>
      </header>

      <main>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Kampanye Saya</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Buat Kampanye Baru</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Buat Kampanye Baru</DialogTitle>
                <DialogDescription>
                  Isi detail di bawah ini untuk memulai kampanye baru Anda.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCampaign} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nama Kampanye
                  </Label>
                  <Input
                    id="name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="col-span-3"
                    required
                  />    
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Deskripsi
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="slug" className="text-right">
                        Tautan Kustom
                    </Label>
                    <div className="col-span-3">
                        <div className="flex items-center">
                            <span className="bg-muted px-3 py-2 rounded-l-md text-sm">/c/</span>
                            <Input
                            id="slug"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            className="rounded-l-none"
                            placeholder="cth: hari-guru-nasional"
                            required
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Hanya huruf, angka, dan tanda hubung (-).</p>
                    </div>
                    </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="picture" className="text-right">
                    Bingkai (PNG)
                  </Label>
                  <Input
                    id="picture"
                    type="file"
                    onChange={(e) => setFrameFile(e.target.files[0])}
                    className="col-span-3"
                    accept="image/png"
                    required
                  />
                </div>

                
                <DialogFooter>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? 'Menyimpan...' : 'Simpan Kampanye'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Area untuk menampilkan daftar kampanye */}
        {loading ? (
          <p className="text-muted-foreground">Memuat kampanye...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <CardTitle>{campaign.campaign_name}</CardTitle>
                    <CardDescription>
                      Digunakan: {campaign.usage_count} kali
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <img src={campaign.frame_url} alt={campaign.campaign_name} className="rounded-md border aspect-square object-cover" />
                    <div className="mt-4 flex w-full space-x-2">
                        <Button asChild className="w-full">
                            <Link to={`/c/${campaign.slug}`}>
                            <Share2 className="mr-2 h-4 w-4" /> Bagikan
                            </Link>
                        </Button>
                        <Button asChild variant="secondary">
                            {/* Link untuk edit akan kita buat nanti */}
                            <Link to={`#`}> 
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Link>
                        </Button>
                        </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground md:col-span-3 text-center">Anda belum memiliki kampanye.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
