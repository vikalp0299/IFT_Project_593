export IDENT_12=$(printf "%16s" "")
echo -e "\033[0;33mCommand: kubectl get fabriccas ord-ca -o=jsonpath='{.status.tlsca_cert}'\033[0m"
export ORDERER_TLS_CERT=$(kubectl get fabriccas ord-ca -o=jsonpath='{.status.tlsca_cert}' | sed -e "s/^/${IDENT_12}/" )

# Dynamically export orderer node certificates
ordererCount=$(kubectl get fabricorderernodes --all-namespaces --no-headers | wc -l)
echo -e "\033[0;32mDetected $ordererCount orderer nodes\033[0m"
for i in $(seq 0 $((ordererCount-1))); do
    echo -e "\033[0;33mCommand: kubectl get fabricorderernodes ord-node${i} -o=jsonpath='{.status.tlsCert}'\033[0m"
    tls_cert=$(kubectl get fabricorderernodes ord-node${i} -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_12}/" )
    echo -e "\033[0;33mCommand: kubectl get fabricorderernodes ord-node${i} -o=jsonpath='{.status.signCert}'\033[0m"
    sign_cert=$(kubectl get fabricorderernodes ord-node${i} -o=jsonpath='{.status.signCert}' | sed -e "s/^/${IDENT_12}/" )
    
    export "ORDERER${i}_TLS_CERT=${tls_cert}"
    export "ORDERER${i}_SIGN_CERT=${sign_cert}"
done
