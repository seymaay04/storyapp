echo "Yeni versiyon (Rolling Update) sifir kesinti ile baslatiliyor..."
kubectl rollout restart deployment storyapp-deployment
echo "Guncelleme durumu izleniyor..."
kubectl rollout status deployment/storyapp-deployment