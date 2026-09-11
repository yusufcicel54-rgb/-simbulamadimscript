# ☕ isimbulamadimscript (IBS) v6.0 - Turbo Edition
> Hata toleranslı, sıfır bağımlılıklı, dinamik tipli ve modern tarayıcı/oyun projeleri için geliştirilmiş yeni nesil gömülebilir (embeddable) betik dili.

`isimbulamadimscript` (kısaca **IBS**), oyun geliştiricilerinin ve web yazılımcılarının projelerine harici büyük motorlar bağlamadan; oyun mantığını, hile/mod sistemlerini ve yapay zekaları tek satırda çalıştırması için tasarlanmış bağımsız bir dildir.

---

## 🚀 1. Hızlı Başlangıç (CDN)

Hiçbir paket veya dosya indirmeden, doğrudan projenizin `<head>` kısmına ekleyerek kullanmaya başlayabilirsiniz:

```html
<script src="https://cdn.jsdelivr.net/gh/yusufcicel54-rgb/-simbulamadimscript/ibs.js"></script>
```

---

## ⚡ 2. v6.0 Turbo Özellikleri

- 🏎️ **Constant Folding (Sabit Katlama):** `let x = 10 + 5 * 2;` gibi matematiksel ifadeler çalışma anında her seferinde hesaplanmaz; derleme anında doğrudan `20` olarak katlanır.
- 💾 **AST Execution Cache:** Aynı kod tekrar çalıştığında sözdizim analizini (Lexer/Parser) atlayarak doğrudan hafızadaki ağaçtan çalıştırılır (50x hız).
- 🛡️ **Sonsuz Döngü Koruması:** `while(1)` gibi hatalı kodlarda cihazın donmaması için 50.000 adım güvenlik sigortası devrededir.
- 🌐 **Urlcall (Loadstring Engine):** İnternetteki (GitHub, Pastebin vb.) harici `.ibs` kodlarını çalışma anında havadan indirip RAM'de derler.

---

## 📖 3. Tam Dil Kılavuzu & Sözdizimi (Syntax Reference)

### 3.1. Değişkenler ve Atamalar
Değişkenler `let` anahtar kelimesi ile tanımlanır. Sayı, metin (string) ve ondalıklı değerleri destekler. Kısayol atamaları (`+=`, `-=`) mevcuttur.

```javascript
// Değişken Tanımlama
let can = 100;
let hiz = 5.5;
let oyuncu_adi = "Kırmızı Hain";

// Değer Güncelleme ve Kısayollar
can = can - 10;
can -= 20;      // 70 kaldı
hiz += 1.5;     // 7.0 oldu
```

---

### 3.2. Operatörler
IBS zengin bir matematiksel ve mantıksal operatör kümesine sahiptir:

| Kategori | Operatörler | Açıklama |
|---|---|---|
| **Aritmetik** | `+`, `-`, `*`, `/` | Toplama, Çıkarma, Çarpma, Bölme |
| **Karşılaştırma** | `==`, `!=`, `<`, `>`, `<=`, `>=` | Eşitlik ve Büyüklük/Küçüklük |
| **Mantıksal** | `&&`, `||`, `!` | VE, VEYA, DEĞİL |

```javascript
let kosul = (can > 50 && hiz >= 7.0) || !(can == 0);
```

---

### 3.3. Karar Yapıları (`if`, `else`) & Auto-Correct
IBS toleranslı bir ayrıştırıcıya (Self-Healing Parser) sahiptir. Parantez unutsanız bile motor çökmez, hatayı otomatik onarır:

```javascript
// Standart Kullanım:
if (can < 30) {
    print "Kritik durum!";
} else {
    print "Durum stabil.";
}

// Auto-Correct (Parantezsiz ve noktalı virgülsüz yazsanız da çalışır):
if can <= 0 {
    print "Oyuncu elendi!"
}
```

---

### 3.4. Döngüler (`while`, `for`, `break`, `continue`)
IBS Turing-complete bir dildir; hem sayaç hem de koşul döngülerini destekler.

#### While Döngüsü:
```javascript
let sayac = 1;
while (sayac <= 5) {
    print sayac;
    if (sayac == 3) {
        break; // Döngüyü anında sonlandırır
    }
    sayac += 1;
}
```

#### For Döngüsü:
```javascript
for (let i = 0; i < 10; i += 1) {
    if (i == 5) {
        continue; // 5'i atla, sonraki tura geç
    }
    print i;
}
```

---

### 3.5. Fonksiyonlar (`fn`, `return`)
Kendi özel fonksiyonlarınızı tanımlayabilir, parametre gönderebilir ve `return` ile değer döndürebilirsiniz:

```javascript
fn hasar_hesapla(temel_guc, kritik_carpan) {
    let toplam = temel_guc * kritik_carpan;
    return toplam;
}

let nihai_hasar = hasar_hesapla(30, 2);
print nihai_hasar; // Çıktı: 60
```

---

### 3.6. Subroutine / Makro Sistemi (`Addbranch`, `End.branch`, `Call`)
Karmaşık fonksiyon imzaları yerine kod bloklarını isimlendirip paketleyin ve tek satırda çağırın:

```javascript
// 1. Kod Bloğunu Paketle:
Addbranch("oldurme_efekti")
    print ">> Hedefe yaklaşıldı!";
    print ">> Bıçak darbesi vuruldu!";
    print ">> Kan efekti patlatıldı!";
End.branch()

// 2. İstediğin Yerden Tek Satırda Çağır:
if (can <= 0) {
    Call("oldurme_efekti");
}
```

---

### 3.7. Uzaktan Kod Yükleme (`Urlcall` - Loadstring)
İnternet üzerindeki harici `.ibs` dosyalarını veya yerel betikleri çalışma anında havadan indirip çalıştırın:

```javascript
// Harici bir GitHub/Pastebin dosyasını anında belleğe yükle ve çalıştır:
Urlcall("https://raw.githubusercontent.com/yusufcicel54-rgb/.../mod.ibs");

// Yerel dosyayı otomatik .ibs uzantısıyla çağır:
Urlcall("depo_gorevleri");
```

---

### 3.8. Yerleşik Standart Kütüphane
Dile önceden tanımlı olarak gelen yardımcı fonksiyonlar:
- `print(...)` -> Konsola çıktı yazar.
- `random(min, max)` -> Belirtilen aralıkta rastgele tam sayı üretir.
- `floor(sayi)` -> Sayıyı aşağı yuvarlar.
- `abs(sayi)` -> Mutlak değer alır.

```javascript
let sans = random(1, 100);
if (sans > 80) {
    print "Kritik Vuruş!";
}
```

---

## 🔌 4. JavaScript / Oyun Motoru Entegrasyonu (Host API Binding)

JavaScript tarafındaki değişkenlerinizi ve fonksiyonlarınızı IBS ortamına bağlayarak oyununuzu tamamen IBS betikleriyle yönetebilirsiniz:

```html
<script src="https://cdn.jsdelivr.net/gh/yusufcicel54-rgb/-simbulamadimscript/ibs.js"></script>

<script>
    // 1. Motoru Başlat
    const ibs = new IBS();

    // 2. JavaScript Fonksiyonunu Dile Tanıt (Bind)
    ibs.bind("ekrani_salla", (siddet) => {
        console.log("Ekran sallanıyor! Şiddet:", siddet);
    });

    ibs.bind("oyuncuyu_isinla", (x, y) => {
        console.log(`Oyuncu (${x}, ${y}) konumuna ışınlandı.`);
    });

    // 3. IBS Betiğini Çalıştır
    const script = `
        let hedef_x = 450;
        let hedef_y = 600;
        
        oyuncuyu_isinla(hedef_x, hedef_y);
        ekrani_salla(0.8);
    `;

    ibs.run(script);

    // 4. Hız Testi (Benchmark):
    ibs.benchmark(script);
</script>
```

---

## 📜 5. Lisans
MIT License © 2026 yusufcicel54-rgb
