let string = "";
let buttons = document.getElementsByTagName("button");
Array.from(buttons).forEach((button) => {
    button.addEventListener('click', (e) => {
        try {
            if (e.target.innerHTML == '=') {

                if (string.includes('^')) {
                    const parts = string.split('^');
                    const result = Math.pow(parseFloat(parts[0]), parseFloat(parts[1]));
                    string = result.toString();
                }
                else if (string.includes('%')) {

                    const parts = string.split('%');
                    const percentage = parseFloat(parts[0]) / 100;
                    const result = percentage * parseFloat(parts[1]);
                    string = result.toString();
                }
                else {

                    string = eval(string);
                }
                document.querySelector('input').value = string;
            } else if (e.target.innerHTML == 'C') {
                string = "";
                document.querySelector('input').value = string;
            }

            else if (e.target.innerHTML == '√') {
                string = Math.sqrt(parseFloat(string)).toString();
                document.querySelector('input').value = string;
            } 
            else if (e.target.innerHTML == '←') {
                string = string.slice(0, -1); 
                document.querySelector('input').value = string;
            } 
            else {
                string = string + e.target.innerHTML;
                document.querySelector('input').value = string;
            }
            button.classList.add('clicked')
            setTimeout(() => button.classList.remove('clicked'), 100);
        } catch (e) {
            string = "";
            document.querySelector('input').value = string;
        }
    });
});
