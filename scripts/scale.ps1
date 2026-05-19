echo "Sistem 3 poddan 5 poda cikariliyor..."
kubectl scale deployment storyapp-deployment --replicas=5
echo "Olcekleme tamamlandi. Mevcut podlari gormek icin: kubectl get pods"