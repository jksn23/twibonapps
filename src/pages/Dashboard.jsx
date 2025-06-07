import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { Share2, Pencil, User, Users, Calendar, Settings, PlusCircle, LogOut, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// Import komponen UI
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';


// Sub-komponen untuk konfirmasi penghapusan, agar kode utama lebih bersih
const DeleteConfirmationDialog = ({ open, onOpenChange, onConfirm, loading }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Apakah Anda Yakin?</DialogTitle>
                <DialogDescription>
                    Tindakan ini tidak dapat diurungkan. Kampanye dan semua data terkait akan dihapus secara permanen.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Batal</Button>
                </DialogClose>
                <Button variant="destructive" onClick={onConfirm} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Ya, Hapus
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);


// Komponen Dashboard Utama
export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State utama
    const [campaigns, setCampaigns] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State untuk Dialog Edit Profil
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [bannerFile, setBannerFile] = useState(null);
    
    // State untuk Dialog Kampanye (Create/Edit)
    const [isCampaignFormOpen, setIsCampaignFormOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [campaignName, setCampaignName] = useState('');
    const [description, setDescription] = useState('');
    const [slug, setSlug] = useState('');
    const [frameFile, setFrameFile] = useState(null);

    // State untuk Dialog Hapus
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [campaignToDelete, setCampaignToDelete] = useState(null);

    // Fungsi untuk mengambil semua data dashboard
    const fetchDashboardData = async () => {
        if (!user) return;
        try {
            // Ambil data profil
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select(`username, full_name, avatar_url, banner_url`)
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;
            setProfile(profileData);
            
            // Ambil data kampanye
            const { data: campaignsData, error: campaignsError } = await supabase.from('campaigns').select('*').eq('owner_id', user.id);
            if (campaignsError) throw campaignsError;
            
            const safeCampaigns = campaignsData || [];
            setCampaigns(safeCampaigns);

        } catch (error) {
            console.error('Error fetching dashboard data:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if(user) {
            fetchDashboardData();
        }
    }, [user]);

    // Handler untuk Edit Profil
    const handleOpenEditProfileDialog = () => {
        setUsername(profile?.username || user.email.split('@')[0]);
        setFullName(profile?.full_name || '');
        setAvatarFile(null);
        setBannerFile(null);
        setIsProfileDialogOpen(true);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!username) {
            alert("Username tidak boleh kosong.");
            return;
        }
        setIsSubmitting(true);
        try {
            let avatar_url = profile?.avatar_url;
            let banner_url = profile?.banner_url;

            if (avatarFile) {
                const filePath = `avatars/${user.id}_${Date.now()}`;
                const { error: uploadError } = await supabase.storage.from('profiles-assets').upload(filePath, avatarFile, { upsert: true });
                if (uploadError) throw uploadError;
                avatar_url = supabase.storage.from('profiles-assets').getPublicUrl(filePath).data.publicUrl;
            }

            if (bannerFile) {
                const filePath = `banners/${user.id}_${Date.now()}`;
                const { error: uploadError } = await supabase.storage.from('profiles-assets').upload(filePath, bannerFile, { upsert: true });
                if (uploadError) throw uploadError;
                banner_url = supabase.storage.from('profiles-assets').getPublicUrl(filePath).data.publicUrl;
            }

            const updates = { id: user.id, username, full_name: fullName, avatar_url, banner_url, updated_at: new Date() };
            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;
            
            alert('Profil berhasil diperbarui!');
            fetchDashboardData();
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
            setIsProfileDialogOpen(false);
        }
    };

    // Handler untuk Kampanye
    const handleOpenCreateCampaignDialog = () => {
        setEditingCampaign(null);
        setCampaignName('');
        setDescription('');
        setSlug('');
        setFrameFile(null);
        setIsCampaignFormOpen(true);
    };
    
    const handleOpenEditCampaignDialog = (campaign) => {
        setEditingCampaign(campaign);
        setCampaignName(campaign.campaign_name);
        setDescription(campaign.description || '');
        setSlug(campaign.slug);
        setFrameFile(null);
        setIsCampaignFormOpen(true);
    };
    
    const handleCampaignFormSubmit = async (e) => {
        e.preventDefault();
        if (!campaignName || !slug || (!frameFile && !editingCampaign)) {
            alert('Harap isi semua field yang diperlukan.');
            return;
        }
        setIsSubmitting(true);
        try {
            let frame_url = editingCampaign?.frame_url;
            let frame_width = editingCampaign?.frame_width;
            let frame_height = editingCampaign?.frame_height;

            if (frameFile) {
                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = URL.createObjectURL(frameFile);
                    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
                    img.onerror = reject;
                });
                frame_width = image.naturalWidth;
                frame_height = image.naturalHeight;

                const filePath = `frames/${user.id}_${Date.now()}`;
                const { error: uploadError } = await supabase.storage.from('frames').upload(filePath, frameFile);
                if (uploadError) throw uploadError;
                frame_url = supabase.storage.from('frames').getPublicUrl(filePath).data.publicUrl;
            }

            const campaignData = { campaign_name: campaignName, description, slug, frame_url, frame_width, frame_height, owner_id: user.id };
            if (editingCampaign) {
                const { error } = await supabase.from('campaigns').update(campaignData).eq('id', editingCampaign.id);
                if (error) throw error;
                alert('Kampanye berhasil diperbarui!');
            } else {
                const { error } = await supabase.from('campaigns').insert(campaignData);
                if (error) throw error;
                alert('Kampanye berhasil dibuat!');
            }
            setIsCampaignFormOpen(false);
            fetchDashboardData();
        } catch (error) {
            alert(`Gagal menyimpan: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handler untuk Hapus
    const handleOpenDeleteDialog = (campaign) => {
        setCampaignToDelete(campaign);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!campaignToDelete) return;
        setIsSubmitting(true);
        try {
            const { error: deleteError } = await supabase.from('campaigns').delete().eq('id', campaignToDelete.id);
            if (deleteError) throw deleteError;

            const filePath = campaignToDelete.frame_url.split('/frames/')[1];
            if (filePath) await supabase.storage.from('frames').remove([filePath]);
            
            alert('Kampanye berhasil dihapus.');
            fetchDashboardData();
        } catch (error) {
            alert(`Gagal menghapus kampanye: ${error.message}`);
        } finally {
            setIsSubmitting(false);
            setIsDeleteDialogOpen(false);
            setCampaignToDelete(null);
        }
    };

    // Handler Logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const displayName = profile?.username || user?.email?.split('@')[0];
    const totalSupporters = campaigns.reduce((acc, c) => acc + (c.usage_count || 0), 0);
    const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';


    return (
        <div className="container mx-auto p-4 md:p-8">
            {/* Profile Header */}
            <div className="mb-12">
                <div className="relative h-40 md:h-56 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg">
                    {profile?.banner_url && <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover rounded-lg"/>}
                </div>
                <div className="relative px-4 sm:px-6 lg:px-8 pb-8">
                    <div className="-mt-20 sm:-mt-24 flex flex-col sm:flex-row sm:items-end sm:space-x-5">
                        <div className="flex-shrink-0">
                            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-card border-4 border-background flex items-center justify-center overflow-hidden">
                                {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover"/> : <User className="h-16 w-16 text-muted-foreground" />}
                            </div>
                        </div>
                        <div className="mt-6 sm:flex-1 sm:min-w-0 sm:flex sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
                            <div className="sm:hidden 2xl:block mt-6 min-w-0 flex-1">
                                <h1 className="text-2xl font-bold text-foreground truncate">{profile?.full_name || displayName}</h1>
                                <p className="text-sm text-muted-foreground truncate">@{displayName}</p>
                            </div>
                            <div className="mt-6 flex flex-col justify-stretch space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
                                <Button variant="outline" onClick={handleOpenEditProfileDialog}><Settings className="mr-2 h-4 w-4" /> Edit Profile</Button>
                                <Button onClick={handleLogout} variant="destructive"><LogOut className="mr-2 h-4 w-4" /> Keluar</Button>
                            </div>
                        </div>
                    </div>
                     <div className="hidden sm:block 2xl:hidden mt-6 min-w-0 flex-1">
                         <h1 className="text-2xl font-bold text-foreground truncate">{profile?.full_name || displayName}</h1>
                         <p className="text-sm text-muted-foreground truncate">@{displayName}</p>
                    </div>
                    <div className="mt-6 border-t border-border pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="flex items-center space-x-3"><Users className="h-6 w-6 text-muted-foreground" /><div><p className="font-bold text-foreground">{totalSupporters}</p><p className="text-sm text-muted-foreground">Supporters</p></div></div>
                        <div className="flex items-center space-x-3"><Pencil className="h-6 w-6 text-muted-foreground" /><div><p className="font-bold text-foreground">{campaigns.length}</p><p className="text-sm text-muted-foreground">Campaigns</p></div></div>
                        <div className="flex items-center space-x-3"><Calendar className="h-6 w-6 text-muted-foreground" /><div><p className="font-bold text-foreground">{joinDate}</p><p className="text-sm text-muted-foreground">Joined Since</p></div></div>
                    </div>
                </div>
            </div>

            {/* Campaign Section */}
            <main>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-foreground">Kampanye Saya</h2>
                    <Button onClick={handleOpenCreateCampaignDialog}><PlusCircle className="mr-2 h-4 w-4" /> Buat Kampanye</Button>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {campaigns.length > 0 ? campaigns.map((c) => (
                        <Card key={c.id} className="flex flex-col overflow-hidden">
                             <CardContent className="p-0"><Link to={`/c/${c.slug}`}><img src={c.frame_url} alt={c.campaign_name} className="rounded-t-lg border-b aspect-square object-cover w-full hover:scale-105 transition-transform duration-300" /></Link></CardContent>
                             <div className="p-4 flex-grow flex flex-col">
                                 <CardTitle className="text-base font-semibold mb-1 truncate"><Link to={`/c/${c.slug}`} className="hover:text-primary transition-colors">{c.campaign_name}</Link></CardTitle>
                                 <div className="flex items-center text-sm text-muted-foreground mb-4"><User className="mr-1.5 h-4 w-4 flex-shrink-0" /><span className="truncate">{displayName}</span></div>
                                 <div className="flex items-center text-sm text-muted-foreground mt-auto"><Users className="mr-1.5 h-4 w-4 flex-shrink-0" /><span>{c.usage_count || 0} Supporters</span></div>
                             </div>
                             <div className="p-4 border-t flex space-x-2">
                                <Button asChild className="w-full" size="sm"><Link to={`/c/${c.slug}`}><Share2 className="mr-2 h-4 w-4" /> Bagikan</Link></Button>
                                <Button onClick={() => handleOpenEditCampaignDialog(c)} variant="secondary" size="sm" className="w-full"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                             </div>
                        </Card>
                    )) : <div className="text-muted-foreground col-span-full text-center py-16 bg-card rounded-lg"><h3 className="text-lg font-semibold">Anda belum memiliki kampanye.</h3><p>Klik tombol "Buat Kampanye" untuk memulai.</p></div>}
                </div>
            </main>

            {/* Dialog untuk Edit Profil */}
             <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Profil</DialogTitle><DialogDescription>Perbarui informasi profil Anda.</DialogDescription></DialogHeader>
                    <form onSubmit={handleProfileUpdate} className="space-y-4 pt-4">
                        <div><Label htmlFor="username">Username</Label><Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
                        <div><Label htmlFor="fullName">Nama Lengkap</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                        <div><Label htmlFor="avatar">Foto Profil</Label><Input id="avatar" type="file" onChange={(e) => setAvatarFile(e.target.files[0])} accept="image/*" /></div>
                        <div><Label htmlFor="banner">Gambar Banner</Label><Input id="banner" type="file" onChange={(e) => setBannerFile(e.target.files[0])} accept="image/*" /></div>
                        <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog untuk Create/Edit Kampanye */}
            <Dialog open={isCampaignFormOpen} onOpenChange={setIsCampaignFormOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingCampaign ? 'Edit Kampanye' : 'Buat Kampanye'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleCampaignFormSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Nama</Label><Input id="name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="col-span-3" required /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="description" className="text-right">Deskripsi</Label><Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="slug" className="text-right">Tautan</Label><div className="col-span-3"><div className="flex items-center"><span className="bg-muted px-3 py-2 rounded-l-md text-sm">/c/</span><Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="rounded-l-none" required /></div></div></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="picture" className="text-right">Bingkai</Label><Input id="picture" type="file" onChange={(e) => setFrameFile(e.target.files[0])} className="col-span-3" accept="image/png" required={!editingCampaign} /></div>
                        <DialogFooter className="sm:justify-between pt-4">
                            {editingCampaign && <Button type="button" variant="destructive" onClick={() => handleOpenDeleteDialog(editingCampaign)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" /> Hapus</Button>}
                             <Button type="submit" disabled={isSubmitting} className={!editingCampaign ? 'w-full' : ''}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : 'Simpan'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Dialog Konfirmasi Hapus */}
            <DeleteConfirmationDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onConfirm={handleConfirmDelete} loading={isSubmitting} />
        </div>
    );
}
