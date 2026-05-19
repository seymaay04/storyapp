# StoryApp - Bulut Bilişim Final Projesi

**Hazırlayan:** Şeyma Ay
**Numara:** 24110310036
**Proje GitHub Linki:** https://github.com/seymaay04/storyapp

## 📌 Proje Özeti
Bu proje, basit bir web uygulamasının (StoryApp) Docker ile konteynerize edilerek Google Kubernetes Engine (GKE) üzerinde modern bulut bilişim standartlarına uygun şekilde dağıtılmasını ve CI/CD süreçleriyle otomatik olarak yönetilmesini amaçlamaktadır.

---

## 1. Uygulama Mimarisi
* **Frontend & Backend:** Node.js tabanlı web uygulaması.
* **Veritabanı:** Veri kalıcılığı ve yönetimi için harici bir bulut veritabanı (MongoDB Atlas) kullanılmıştır.
* **Konteynerizasyon:** Uygulamanın tüm bağımlılıkları ve çalışma ortamı `Dockerfile` ile izole edilmiş ve paketlenmiştir.

## 2. Sistem Mimarisi
Geliştirme ortamında yazılan kodlar, GitHub'a push edildiği anda sistem mimarisi şu şekilde çalışır:
1. Kaynak kodlar GitHub Repository'sinde tutulur.
2. Değişiklikler **Google Cloud Build** tetikleyicisini çalıştırır.
3. Yeni Docker imajı derlenir ve Google Container Registry (GCR)'ye gönderilir.
4. GCR'daki güncel imaj, GKE (Google Kubernetes Engine) kümesine otomatik olarak dağıtılır.

## 3. Kubernetes Mimarisi ve Bileşenlerin Görevleri
Sistemin yüksek erişilebilir ve güvenli olması için aşağıdaki Kubernetes objeleri kullanılmıştır:

* **Deployment:** Uygulama Pod'larını yönetmek, "istenen durumu" korumak ve kesintisiz güncellemeler sağlamak için kullanıldı.
* **Service (LoadBalancer):** Pod'lara dış dünyadan erişimi sağlamak ve gelen internet trafiğini Pod'lar arasında dengeli bir şekilde dağıtmak için kullanıldı.
* **Secret Management:** Veritabanı bağlantı dizesi (MongoDB URI) gibi hassas veriler kod içinde ifşa edilmek yerine, K8s Secret olarak şifrelenmiş ve Pod'lara çevresel değişken (Env Variable) olarak enjekte edilmiştir.
* **Persistent Volume Claim (PVC):** Uygulamanın log verileri gibi kalıcı olması gereken veriler için Google Cloud üzerinden 1 GB'lık kalıcı disk (PV) talep edilip sisteme bağlanmıştır (`storyapp-log-pvc`).
* **NetworkPolicy:** Uygulamanın ağ güvenliğini sağlamak amacıyla, sadece uygulamanın çalıştığı spesifik porta (3000) Ingress (giriş) izni veren güvenlik kuralları tanımlanmıştır.

## 4. CI/CD Pipeline Akışı
Sürekli Entegrasyon ve Sürekli Dağıtım (CI/CD) için **Cloud Build** yapılandırılmıştır (`cloudbuild.yaml`).
* Geliştirici kodu `main` dalına push'ladığı an süreç başlar.
* İmaj build edilir, etiketlenir ve GCR'a push'lanır.
* `kubectl apply` komutu Cloud Build tarafından çalıştırılarak sıfır insan müdahalesi ile GKE üzerindeki Deployment güncellenir.

## 5. Operasyonel Yönetim Adımları

Sistem üzerinde gerçekleştirilen temel yönetim senaryoları şunlardır:

**Ölçekleme (Scaling):** Trafik artışı anında uygulamanın Pod sayısı artırılır:
```bash
kubectl scale deployment/storyapp-deployment --replicas=5
```
(Not: Uygulamanın veri kalıcılığını sağlamak amacıyla kullanılan Persistent Volume, ReadWriteOnce (RWO) erişim moduna sahiptir. Bu mod, bir diskin aynı anda sadece tek bir sunucu (Node) tarafından okunup yazılmasına izin veren blok depolama (Block Storage) prensibine dayanır. Bu durum, donanımsal bir kısıt olup; diskin verisinin bozulmaması için aynı anda birden fazla sunucuya bağlanması teknik olarak mümkün değildir. Çoklu sunucu üzerinden ölçekleme yapılması durumunda; podların aynı sunucu üzerinde çalışması (Node Affinity) veya bulut tabanlı merkezi bir dosya depolama sistemi (NFS/Filestore) yapılandırılması gerekmektedir. Proje tek replika üzerinde yüksek performanslı çalışacak şekilde optimize edilmiştir.)


**Güncelleme Stratejisi (Update Strategy):** Yönerge gereği sisteme eklenen Persistent Volume (PVC), ReadWriteOnce erişim moduna sahiptir. Bu disk türünde Rolling Update kullanılması, eski Pod diski bırakmadan yeni Pod'un diski talep etmesine ve sistemin "Deadlock" (kilitlenme) durumuna düşmesine sebep olabilir. Bu nedenle veri bütünlüğünü korumak ve kilitlenmeleri önlemek amacıyla deployment.yaml içerisinde bilinçli olarak Recreate stratejisi yapılandırılmıştır.
```bash
kubectl rollout status deployment/storyapp-deployment
```

**Sürüm Geri Alma (Rollback):** Hatalı bir sürüm canlıya çıktığında, Kubernetes'in "Revision History" (sürüm geçmişi) özelliği kullanılarak saniyeler içinde eski ve stabil sürüme dönülür:
```bash
kubectl rollout undo deployment/storyapp-deployment
```
