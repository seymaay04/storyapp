echo "Sistem bir onceki saglam surume (Rollback) donduruluyor..."
kubectl rollout undo deployment storyapp-deployment
echo "Geri alma basarili."