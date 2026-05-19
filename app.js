require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const methodOverride = require('method-override');

// Modeller
const User = require('./models/User');
const Story = require('./models/Story');

const app = express();

// Arayüz ve Form Ayarları
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // Silme ve güncelleme işlemleri için

// Kullanıcı Girişi (Session) Ayarı
app.use(session({
    secret: 'cok_gizli_anahtar',
    resave: false,
    saveUninitialized: true
}));

// Giriş yapan kullanıcıyı her arayüz sayfasında tanıyabilmek için
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Veritabanı Bağlantısı
console.log("Bağlanmaya çalışılan URI:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🚀 Veritabanı bağlandı!"))
    .catch(err => console.log("❌ Hata:", err));

    
// YÖNLENDİRMELER (ROUTES)

// 1. ANA SAYFA
app.get('/', async (req, res) => {
    // Tüm hikayeleri en yeniden en eskiye sıralayarak getir
    const stories = await Story.find().sort({ createdAt: -1 });
    res.render('index', { stories });
});

// 2. GİRİŞ VE KAYIT EKRANI
app.get('/auth', (req, res) => {
    res.render('auth', { error: null });
});

// Kayıt Olma İşlemi
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    // Bu isim daha önce alınmış mı kontrol et
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.render('auth', { error: 'Bu kullanıcı adı daha önce alınmış!' });
    }

    // Yeni kullanıcı oluştur ve sisteme kaydet
    const newUser = new User({ username, password });
    await newUser.save();
    
    // Otomatik giriş yap ve ana sayfaya gönder
    req.session.user = newUser; 
    res.redirect('/');
});

// Giriş Yapma İşlemi
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Veritabanında eşleşen kullanıcıyı bul
    const user = await User.findOne({ username, password });
    if (!user) {
        return res.render('auth', { error: 'Kullanıcı adı veya şifre hatalı!' });
    }

    // Başarılıysa session'a kaydet ve ana sayfaya dön
    req.session.user = user;
    res.redirect('/');
});

// Çıkış Yapma İşlemi
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 3. YAZI EKLEME
app.get('/add', (req, res) => {
    if (!req.session.user) return res.redirect('/auth'); // Giriş yapılmamışsa at
    res.render('add');
});

app.post('/add', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth');
    
    await Story.create({
        title: req.body.title,
        content: req.body.content,
        author: req.session.user.username // Yazarı otomatik belirle
    });
    res.redirect('/');
});

// 4. YAZI DÜZENLEME
app.get('/edit/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth');
    
    const story = await Story.findById(req.params.id);
    // Güvenlik: Yazı bu kullanıcıya ait değilse geri gönder
    if(story.author !== req.session.user.username) return res.redirect('/');
    
    res.render('edit', { story });
});

app.put('/edit/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth');
    
    await Story.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        content: req.body.content
    });
    res.redirect('/');
});

// 5. YAZI SİLME
app.delete('/delete/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth');
    
    // Güvenlik: Sadece sahibi silebilir (bunu garantiye almak için ek kontrol yapıyoruz)
    const story = await Story.findById(req.params.id);
    if(story && story.author === req.session.user.username){
        await Story.findByIdAndDelete(req.params.id);
    }
    
    res.redirect('/');
});

// 6. BENİM HİKAYELERİM (Sadece giriş yapan kullanıcının kendi yazılarını listeler)
app.get('/my-stories', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth'); // Giriş yapılmamışsa giriş ekranına at
    
    // Veritabanında sadece yazar adı, aktif kullanıcının adı olan hikayeleri filtrele
    const myStories = await Story.find({ author: req.session.user.username }).sort({ createdAt: -1 });
    
    res.render('my-stories', { stories: myStories });
});

// 7. HERHANGİ BİR YAZARIN PROFİLİ / HİKAYELERİ (Dinamik Rota)
app.get('/author/:username', async (req, res) => {
    const authorName = req.params.username;
    
    // Veritabanında yazar ismi urlden gelen parametre ile eşleşen yazıları getir
    const authorStories = await Story.find({ author: authorName }).sort({ createdAt: -1 });
    
    res.render('author-stories', { 
        stories: authorStories, 
        authorName: authorName 
    });
});

// Sunucuyu Ayaklandır
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🌍 Sunucu ayağa kalktı: http://localhost:${PORT}`);
});