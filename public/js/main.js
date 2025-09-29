const button = document.querySelector('#show-files');
const output = document.querySelector('#output');

async function showFiles(){
    try {
        const res = await fetch('http://localhost:5000/api/dispfiles');
        console.log(res);
        if(!res.ok) throw new Error('Error in fetching files');
        const files = await res.json();
       
        output.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('div');
            li.textContent = file.name;
            output.appendChild(li);
        });
    } catch (error) {
        console.error('Error Fetching files',error);
    }


}
showFiles();
button.addEventListener('click',showFiles);